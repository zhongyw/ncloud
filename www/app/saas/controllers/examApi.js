'use strict';

var
    _ = require('lodash'),
    thunkify = require('thunkify'),
    oauth2 = require('oauth2-warp'),
    api = require('../../../api'),
    db = require('../../../db'),
    auth = require('../../../auth'),
    helper = require('../../../helper'),
    config = require('../../../config'),
    json_schema = require('../../../json_schema'),
    constants = require('../../../constants');

var categoryApi = require('./categoryApi');

var
    User = db.user,
    AuthUser = db.authuser,
    LocalUser = db.localuser,
    Category = db.category,
    Exam = db.exam,
    warp = db.warp,
    next_id = db.next_id;

function* $getExams(page){
  page.total = yield Exam.$findNumber('count(id)');
  if (page.isEmpty){
    return [];
  }
  var exams = yield Exam.$findAll({
    offset: page.offset,
    limit: page.limit,
    order: 'created_at desc'
  });
  return exams;
}

function* $getExam(id){
  var exam = yield Exam.$find(id);
  if(exam === null){
    throw api.notFound('Exam');
  }
  return exam;
}

module.exports = {
  'GET /api/exams/:id': function* (id){
    /**
     * Get Exam
     *
     * @name Get Exam
     * @param {string} id: Id of the article
     * @return {object} Exam object
     */
    var exam = yield $getExam(id);
    this.body = exam;
  },
  'GET /api/exams': function* (){
    /**
    * Get exams by page.
    *
    * @name Get exams
    * @param {number} [page=1]: The page number, starts from 1.
    * @return {object} Exam objects and page information.
    */
    // helper.checkPermission(this.request, constants.role.EDITOR);
    var
        page = helper.getPage(this.request),
        exams = yield $getExams(page);
    console.log("exams=:" , exams);
    this.body = {
        page: page,
        exams: exams
    };
  },
  'POST /api/exams': function* (){
      /**
      * Create a new Exam.
      *
      * @name Create Exam
      * @param {string} title: Title of the exam.
      * @param {string} description: Desc of the exam.
      * @param {string} answer: Answer of the exam.
      * @return {object} The created exam object.
      * @error {parameter:invalid} if some parameter is invalid.
      * @error {permission:denied} if current user has no permission.
      */
      helper.checkPermission(this.request, constants.role.EDITOR);
      var data = this.request.body;

      var exam = yield Exam.$create({
        title: data.title,
        description: data.description,
        answer: data.answer,
        user_id: this.request.user.id,
        user_name: this.request.user.name,
        category_id: data.category_id,
        tags: helper.formatTags(data.tags)
      });

      this.body = exam;
  },

  'POST /api/exams/:id': function* (id){
    /**
    * Update an exist exam
    *
    * @name Update exam
    * @param {string} id: Id of exam
    * @param {string} [title]: Title of exam
    * @param {string} [desc]: Description of exam
    * @param {string} [answer]: Answer of exam
    */
    helper.checkPermission(this.request, constants.role.EDITOR);
    var exam,
        props = [],
        data = this.request.body;
    json_schema.validate('updateExam', data);

    exam = yield $getExam(id);

    if(data.title){
      exam.title = data.title.trim();
      props.push('title');
    }
    if(data.description){
      exam.description = data.description.trim();
      props.push('description');
    }
    if(data.answer){
      exam.answer = data.answer.trim();
      props.push('answer');
    }
    if(data.category_id){
      exam.category_id = data.category_id;
      props.push('category_id');
    }
    if(data.tags){
      exam.tags = helper.formatTags(data.tags);
      props.push('tags');
    }
    if(props.length > 0){
      props.push('updated_at');
      props.push('version');
      yield exam.$update(props);
    }
    this.body = exam;
  },

  'POST /api/exams/:id/delete': function* (id){
    /**
     * Delete an exams.
     *
     * @name Delete Exam
     * @param {string} id: Id of the exam.
     * @return {object} Object contains deleted id.
     * @error {resource: nofound} Exam not found by id.
     * @error {permission: denied} If current user has no permission.
     */
     var
        user = this.request.user,
        exam = yield $getExam(id);
     if(user.role !== constants.role.ADMIN && user.id !== exam.user_id){
       throw api.notAllowed('Permission denied.');
     }
     yield exam.$destroy();
     this.body = {
       id: id
     }
  },
  'POST /api/exams/delete/selected': function* () {
      /**
       * Delete exams by ids.
       *
       * @name Delete Exams
       * @param {array} ids - The ids of exams.
       * @return {object} Results contains deleted id. e.g. {"ids": ['id_aiejfi12', 'id_asdf212312']}
       */

      helper.checkPermission(this.request, constants.role.ADMIN);
      var deletedIds = [],
          ids = this.request.body.ids;

      for(var i = 0; i < ids.length; i++){
        var
            exam = yield $getExam(ids[i]);

        yield exam.$destroy();
        deletedIds.push(ids[i]);
      }


      this.body = {
          deletedIds: deletedIds
      };
  }

}
