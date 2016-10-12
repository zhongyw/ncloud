'use strict';

var
    _ = require('lodash'),
    should = require('should'),
    remote = require('./_remote'),
    constants = require('../constants'),
    roles = constants.role;

describe('#exam', function(){

    before(remote.setup);

    describe('#api', function(){

        it('create exam', function* (){
            var r = yield remote.$post(roles.EDITOR, '/api/createExam', {
              title: 'This is title',
              desc: 'This is desc',
              answer: 'This is answer'
            })
            remote.shouldNoError(r);
            r.title.should.equal('This is title');
            r.desc.should.equal('This is desc');
            r.answer.should.equal('This is answer');
            r.version.should.equal(0);
        })
        it('get exams', function* (){
          var r = yield remote.$get(roles.EDITOR, '/api/exams', {});
          remote.shouldNoError(r);
          r.page.total.should.equal(1);
          r.exams.should.be.an.Array.and.have.length(1);
        })

    });
});
