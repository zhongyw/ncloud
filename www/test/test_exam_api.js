'use strict';

var
    _ = require('lodash'),
    should = require('should'),
    co = require('co'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#exam', function(){

    var category = null;
    var category2 = null;

    before(remote.setup);

    before(function (done){
      co(function* (){
        category = yield remote.$post(roles.ADMIN, '/api/categories', {
            name: 'Article Category',
            tag: 'cat1'
        });
        remote.shouldNoError(category);
        category2 = yield remote.$post(roles.ADMIN, '/api/categories', {
            name: 'Article Category 2',
            tag: 'cat2'
        });
        remote.shouldNoError(category2);
        return 'ok';
      }).then(function (result) {
          done();
      }, function (err) {
          done(err);
      });;
    });

    describe('#api', function(){

        it('create and update exam by editor', function* (){
            var r = yield remote.$post(roles.EDITOR, '/api/exams', {
              category_id: category.id,
              title: 'This is title',
              description: 'This is description',
              answer: 'This is answer'
            })
            remote.shouldNoError(r);
            r.title.should.equal('This is title');
            r.description.should.equal('This is description');
            r.answer.should.equal('This is answer');
            r.version.should.equal(0);

            // update exam:
            var r2 = yield remote.$post(roles.EDITOR, '/api/exams/' + r.id, {
              title: 'title changed',
              description: 'description changed',
              answer: 'answer changed'
            });
            remote.shouldNoError(r2);
            r2.title.should.equal('title changed');
            r2.description.should.equal('description changed');
            r2.answer.should.equal('answer changed');
            r2.version.should.equal(1);

            //query:
            var r3 = yield remote.$get(roles.EDITOR, '/api/exams/' + r.id);
            r3.title.should.equal(r2.title);
            r3.description.should.equal(r2.description);
            r3.answer.should.equal(r2.answer);
        });
        it('create and delete exam by editor', function*(){
            // create exam:
            var r1 = yield remote.$post(roles.EDITOR, '/api/exams', {
              category_id: category.id,
              title: 'To Be Delete...  ',
              description: 'blablabla\nhaha... \n ',
              answer: 'Answer not change...'
            });
            remote.shouldNoError(r1);

            // delete exam:
            var r2 = yield remote.$post(roles.EDITOR, '/api/exams/' + r1.id + '/delete');
            remote.shouldNoError(r2);
            r2.id.should.equal(r1.id);

            // query:
            var r3 = yield remote.$get(roles.EDITOR, '/api/exams/' + r1.id);
            remote.shouldHasError(r3, 'entity:notfound', 'Exam');
        })
        it('get exams', function* (){
          var r = yield remote.$get(roles.EDITOR, '/api/exams', {});
          remote.shouldNoError(r);
          r.page.total.should.equal(1);
          r.exams.should.be.an.Array.and.have.length(1);
        });
        it('delete exams by admin', function* () {
            // create first:
            var r = yield remote.$post(roles.ADMIN, '/api/exams', {
                title: 'Before Delete',
                answer: 'java',
                category_id: category.id,
                description: '112  '
            });
            remote.shouldNoError(r);
            r.title.should.equal('Before Delete');
            // create second:
            var r11 = yield remote.$post(roles.ADMIN, '/api/exams', {
                title: 'Before Delete2',
                answer: 'java2',
                category_id: category.id,
                description: '333 '
            });
            remote.shouldNoError(r11);
            r11.title.should.equal('Before Delete2');
            var ids = [r.id, r11.id];

            // try delete:
            var r2 = yield remote.$post(roles.ADMIN, '/api/exams/delete/selected', {ids: ids});
            remote.shouldNoError(r2);
            r2.deletedIds[0].should.equal(r.id);
            r2.deletedIds[1].should.equal(r11.id);

            // try get again:
            var r3 = yield remote.$get(roles.GUEST, '/api/exams/' + r.id);
            remote.shouldHasError(r3, 'entity:notfound', 'Exam');
            var r311 = yield remote.$get(roles.GUEST, '/api/exams/' + r11.id);
            remote.shouldHasError(r311, 'entity:notfound', 'Exam');
        });

    });
});
