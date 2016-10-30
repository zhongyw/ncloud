'use strict';

// test user api:

var
    _ = require('lodash'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#user', function () {

    before(remote.setup);

    describe('#api', function () {

        it('get users by editor and contributor', function* () {
            var i;
            // get users by contributor:
            var r1 = yield remote.$get(roles.CONTRIBUTOR, '/api/users');
            remote.shouldHasError(r1, 'permission:denied');
            // get users by editor:
            var r2 = yield remote.$get(roles.EDITOR, '/api/users');
            remote.shouldNoError(r2);
            r2.page.total.should.equal(4);
            r2.users.should.be.an.Array.and.have.length(4);
            var uid = r2.users[0].id;
            // get user by contributor:
            var r3 = yield remote.$get(roles.CONTRIBUTOR, '/api/users/' + uid);
            remote.shouldHasError(r3, 'permission:denied');
            // get user by editor:
            var r4 = yield remote.$get(roles.EDITOR, '/api/users/' + uid);
            remote.shouldNoError(r4);
        });

        it('auth should ok', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@nbn8.com',
                passwd: remote.generatePassword('admin@nbn8.com')
            });
            remote.shouldNoError(r);
            r.email.should.equal('admin@nbn8.com');
        });

        it('auth should failed for bad password', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@nbn8.com',
                passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
            });
            remote.shouldHasError(r, 'auth:failed');
        });

        it('auth should failed for invalid password', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@nbn8.com',
                passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
            });

            remote.shouldHasError(r, 'auth:failed', 'passwd');
        });

        it('auth should failed for invalid email', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'notexist@nbn8.com',
                passwd: 'bad0000000ffffffffffffffffffffffffffffff' // 40-char
            });
            remote.shouldHasError(r, 'auth:failed', 'email');
        });

        it('auth missing param', function* () {
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'admin@nbn8.com'
            });
            remote.shouldHasError(r, 'parameter:invalid', 'passwd');
        });

        it('auth should forbidden because password is not set', function* () {
            yield remote.warp.$update('delete from localusers where user_id in (select id from users where email=?)', ['contributor@nbn8.com']);
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'contributor@nbn8.com',
                passwd: remote.generatePassword('contributor@nbn8.com')
            });
            remote.shouldHasError(r, 'auth:failed', 'passwd');
        });

        it('auth should locked', function* () {
            yield remote.warp.$update('update users set locked_until=? where email=?', [Date.now() + 3600000, 'editor@nbn8.com']);
            var r = yield remote.$post(roles.GUEST, '/api/authenticate', {
                email: 'editor@nbn8.com',
                passwd: remote.generatePassword('editor@nbn8.com')
            });
            remote.shouldHasError(r, 'auth:failed', 'locked');
        });
        it('multiple user should lock at once', function* () {
            var r22 = yield remote.$get(roles.ADMIN, '/api/users'),
                users = r22.users,
                userIds = [];
            users.map((user)=>{user.name == 'admin'? "" : userIds.push(user.id)})
            var r = yield remote.$post(roles.ADMIN, '/api/users/lock/selected', {
                ids: userIds,
                locked_until: 3000
            });
            remote.shouldNoError(r);
            r.locked_until.should.equal(3000);
            r.freezedIds.should.be.an.Array.and.have.length(3)
        });

    });
});
