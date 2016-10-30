'use strict';

// discuss api

var
    _ = require('lodash'),
    db = require('../../../db'),
    api = require('../../../api'),
    cache = require('../../../cache'),
    helper = require('../../../helper'),
    search = require('../../../search/search'),
    constants = require('../../../constants'),
    json_schema = require('../../../json_schema'),
    userApi = require('./userApi');

var
    Board = db.board,
    Topic = db.topic,
    Reply = db.reply,
    warp = db.warp,
    next_id = db.next_id;

function indexDiscuss(r) {
    var doc = {
        type: 'discuss',
        id: r.id,
        tags: r.tags || '',
        name: r.name,
        description: '',
        content: helper.html2text(r.content),
        created_at: r.created_at,
        updated_at: r.updated_at,
        url: '/discuss/' + (r.topic_id ? 'topics/' + r.topic_id + '/find/' + r.id : r.board_id + '/' + r.id),
        upvotes: 0
    };
    process.nextTick(function () {
        search.engine.index(doc);
    });
}

function unindexDiscuss(r) {
    process.nextTick(function () {
        search.engine.unindex({
            id: r.id
        });
    });
}

function unindexDiscussByIds(ids) {
    process.nextTick(function () {
        var
            arr = ids,
            fn = function () {
                if (arr.length > 0) {
                    if (arr.length > 10) {
                        search.engine.unindex(arr.splice(arr.length - 10, 10));
                    } else {
                        search.engine.unindex(arr.splice(0, arr.length));
                    }
                    setTimeout(fn, 500);
                }
            };
        fn();
    });
}

function* $getNavigationMenus() {
    return [{
        name: 'Discuss',
        url: '/discuss'
    }];
}

function* $getBoard(id) {
    var board = yield Board.$find(id);
    if (board === null) {
        throw api.notFound('Board');
    }
    return board;
}

function* $getBoardByTag(tag) {
    var
        boards = yield $getBoards(),
        filtered = _.filter(boards, function (b) {
            return b.tag === tag;
        });
    if (filtered.length === 0) {
        throw api.notFound('Board');
    }
    return filtered[0];
}

function* $getBoards() {
    return yield Board.$findAll({
        order: 'display_order'
    });
}

function* $lockBoard(id, locked) {
    var board = yield $getBoard(id);
    if (board.locked !== locked) {
        board.locked = locked;
        yield board.$update(['locked', 'updated_at', 'version']);
    }
    return board;
}

function* $getTopic(id) {
    var topic = yield Topic.$find(id);
    if (topic === null) {
        throw api.notFound('Topic');
    }
    return topic;
}

var TOPIC_FIELDS_EXCLUDE_CONTENT = _.filter(Topic.__selectAttributesArray, function (field) {
    return field !== 'content';
});

function* $getAllTopics(page) {
    page.total = yield Topic.$findNumber({
        select: 'count(id)'
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Topic.$findAll({
        select: TOPIC_FIELDS_EXCLUDE_CONTENT,
        order: 'id desc',
        offset: page.offset,
        limit: page.limit
    });
}

function* $getTopics(board_id, page) {
    page.total = yield Topic.$findNumber({
        select: 'count(id)',
        where: 'board_id=?',
        params: [board_id]
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Topic.$findAll({
        select: TOPIC_FIELDS_EXCLUDE_CONTENT,
        where: 'board_id=?',
        params: [board_id],
        order: 'updated_at desc',
        offset: page.offset,
        limit: page.limit
    });
}

function* $getTopicsByRef(ref_id, page) {
    page.total = yield Topic.$findNumber({
        select: 'count(id)',
        where: 'ref_id=?',
        params: [ref_id]
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Topic.$findAll({
        where: 'ref_id=?',
        params: [ref_id],
        order: 'updated_at desc',
        offset: page.offset,
        limit: page.limit
    });
}

function* $getAllReplies(page) {
    page.total = yield Reply.$findNumber({
        select: 'count(id)'
    });
    if (page.isEmpty) {
        return [];
    }
    return yield Reply.$findAll({
        order: 'id desc',
        offset: page.offset,
        limit: page.limit
    });
}

function* $getReplies(topic_id, page) {
    var num = yield Reply.$findNumber({
        select: 'count(id)',
        where: 'topic_id=?',
        params: [topic_id]
    });
    // items = 1 topic + N replies:
    page.total = num + 1;
    if (num === 0) {
        return [];
    }
    return yield Reply.$findAll({
        where: 'topic_id=?',
        params: [topic_id],
        order: 'id',
        offset: (page.index === 1) ? 0 : (page.offset - 1),
        limit: (page.index === 1) ? (page.limit - 1) : page.limit
    });
}

function* $getFirstReplies(topic_id, num) {
    return yield Reply.$findAll({
        where: 'topic_id=?',
        params: [topic_id],
        order: 'id',
        limit: num
    });
}

function* $getReplyPageIndex(topic, reply_id) {
    var
        num = yield Reply.$findNumber({
            select: 'count(id)',
            where: 'topic_id=? and id < ?',
            params: [topic.id, reply_id]
        });
    return Math.floor((num + 1) / 20) + 1;
}

function* $createReply(user, topic_id, data) {
    var
        reply,
        topic = yield $getTopic(topic_id);
    if (topic.locked) {
        throw api.conflictError('Topic', 'Topic is locked.');
    }
    reply = yield Reply.$create({
        topic_id: topic_id,
        user_id: user.id,
        content: helper.md2html(data.content)
    });
    yield warp.$update('update topics set replies=replies+1, version=version+1, updated_at=? where id=?', [Date.now(), topic_id]);
    reply.name = 'Re:' + topic.name;
    indexDiscuss(reply);
    delete reply.name;
    if (topic.ref_id) {
        yield cache.$remove('REF-TOPICS-' + topic.ref_id);
    }
    return reply;
}

function* $createTopic(user, board_id, ref_type, ref_id, data) {
    var
        board = yield $getBoard(board_id),
        topic = yield Topic.$create({
            board_id: board_id,
            user_id: user.id,
            ref_type: ref_type,
            ref_id: ref_id,
            name: data.name.trim(),
            tags: (data.tags || '').trim(),
            content: helper.md2html(data.content)
        });
    yield warp.$update('update boards set topics = topics + 1 where id=?', [board_id]);
    indexDiscuss(topic);
    if (ref_id) {
        yield cache.$remove('REF-TOPICS-' + ref_id);
    }
    return topic;
}

function* $loadTopicsByRefWithCache(ref_id, page) {
    if (page.index === 1) {
        var key = 'REF-TOPICS-' + ref_id;
        return yield cache.$get(key, function* () {
            return yield $loadTopicsByRef(ref_id, page);
        });
    }
    return yield $loadTopicsByRef(ref_id, page);
}

function* $loadTopicsByRef(ref_id, page) {
    var
        i,
        topics = yield $getTopicsByRef(ref_id, page);
    yield userApi.$bindUsers(topics);
    for (i=0; i<topics.length; i++) {
        yield $bindReplies(topics[i]);
    }
    return topics;
}

function* $bindReplies(topic) {
    var key = 'REPLIES-' + topic.id + '_' + topic.version;
    topic.replies = yield cache.$get(key, function* () {
        var replies = yield $getFirstReplies(topic.id, 10);
        yield userApi.$bindUsers(replies);
        return replies;
    });
}

module.exports = {

    $getNavigationMenus: $getNavigationMenus,

    $createTopic: $createTopic,

    $getBoard: $getBoard,

    $getBoardByTag: $getBoardByTag,

    $getBoards: $getBoards,

    $getTopic: $getTopic,

    $getTopics: $getTopics,

    $getTopicsByRef: $getTopicsByRef,

    $getReplies: $getReplies,

    $getFirstReplies: $getFirstReplies,

    $getReplyPageIndex: $getReplyPageIndex,

    'GET /api/ref/:id/topics': function* (id) {
        /**
         * Get topics by ref id
         */
        var
            page = helper.getPage(this.request, 10),
            topics = yield $loadTopicsByRefWithCache(id, page);
        this.body = {
            page: page,
            topics: topics
        };
    },

    'GET /api/boards': function* () {
        /**
         * Get all boards.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        this.body = {
            boards: yield $getBoards()
        };
    },

    'POST /api/boards': function* () {
        /**
         * Create new board.
         *
         * @name Create Board
         * @param {string} name - The name of the board.
         * @param {string} description - The description of the board.
         * @return {object} Board object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            num,
            data = this.request.body;
        json_schema.validate('createBoard', data);

        num = yield Board.$findNumber('max(display_order)');
        this.body = yield Board.$create({
            name: data.name.trim(),
            tag: data.tag.trim(),
            description: data.description.trim(),
            display_order: ((num === null) ? 0 : num + 1)
        });
    },

    'GET /api/boards/:id': function* (id) {
        helper.checkPermission(this.request, constants.role.EDITOR);
        this.body = yield $getBoard(id);
    },

    'POST /api/boards/:id': function* (id) {
        /**
         * Update a board.
         *
         * @name Update Board
         * @param {string} id - The id of the board.
         * @param {string} [name] - The new name of the board.
         * @param {string} [description] - The new description of the board.
         * @return {object} Board object that was updated.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);

        var
            board,
            props = [],
            data = this.request.body;
        json_schema.validate('updateBoard', data);

        board = yield $getBoard(id);
        if (data.name) {
            board.name = data.name.trim();
            props.push('name');
        }
        if (data.description) {
            board.description = data.description.trim();
            props.push('description');
        }
        if (data.tag) {
            board.tag = data.tag.trim();
            props.push('tag');
        }
        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield board.$update(props);
        }
        this.body = board;
    },

    'POST /api/boards/:id/lock': function* (id) {
        /**
         * Lock the board by its id.
         *
         * @name Lock Board
         * @param {string} id - The id of the board.
         * @return {object} Board object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = yield $lockBoard(id, true);
    },

    'POST /api/boards/:id/unlock': function* (id) {
        /**
         * Unlock the board by its id.
         *
         * @name Unlock Board
         * @param {string} id - The id of the board.
         * @return {object} Board object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = yield $lockBoard(id, false);
    },

    'POST /api/boards/all/sort': function* () {
        /**
         * Sort boards.
         *
         * @name Sort Boards
         * @param {array} id: The ids of boards.
         * @return {object} The sort result like { "sort": true }.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);

        var
            board, boards,
            i, pos, ids,
            data = this.request.body;
        json_schema.validate('sortBoards', data);

        ids = data.ids;
        boards = yield Board.$findAll();
        if (ids.length !== boards.length) {
            throw api.invalidParam('ids', 'Invalid id list.');
        }
        for (i=0; i<boards.length; i++) {
            board = boards[i];
            pos = ids.indexOf(board.id);
            if (pos === (-1)) {
                throw api.invalidParam('ids', 'Invalid id list.');
            }
            board.display_order = pos;
        }
        for (i=0; i<boards.length; i++) {
            yield boards[i].$update(['display_order', 'updated_at', 'version']);
        }
        this.body = {
            boards: yield $getBoards()
        };
    },

    'GET /api/boards/:id/topics': function* (board_id) {
        /**
         * Get topics by page.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            page = helper.getPage(this.request),
            topics = yield $getTopics(board_id, page);
        this.body = {
            page: page,
            topics: topics
        };
    },

    'POST /api/boards/:id/topics': function* (board_id) {
        /**
         * Post a new topic.
         *
         * @param {string} id: The id of board.
         * @param {string} name: The name of topic.
         * @param {string} tags: The tags of topic.
         * @param {string} content: The content of topic.
         * @return {object} The topic object.
         */
        helper.checkPermission(this.request, constants.role.SUBSCRIBER);
        var
            topic,
            data = this.request.body;
        json_schema.validate('createTopic', data);
        topic = yield $createTopic(this.request.user, board_id, '', '', data);
        this.body = topic;
    },

    'GET /api/topics': function* () {
        /**
         * Get all topics.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            page = helper.getPage(this.request),
            topics = yield $getAllTopics(page);
        yield userApi.$bindUsers(topics);
        this.body = {
            page: page,
            topics: topics
        };
    },

    'GET /api/replies': function* () {
        /**
         * Get all replies by page.
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            page = helper.getPage(this.request),
            replies = yield $getAllReplies(page);
        yield userApi.$bindUsers(replies);
        this.body = {
            page: page,
            replies: replies
        };
    },

    'POST /api/replies/:id/delete': function* (id) {
        /**
         * Delete a reply by its id. NOTE delete a reply only mark it is deleted.
         *
         * @name Delete Reply.
         * @param {string} id - The id of the reply.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var reply = yield Reply.$find(id);
        if (reply === null) {
            throw api.notFound('Reply');
        }
        reply.deleted = true;
        yield reply.$update(['deleted', 'updated_at', 'version']);
        unindexDiscuss(reply);
        this.body = {
            id: id
        };
    },

    'POST /api/topics/:id/delete': function* (id) {
        /**
         * Delete a topic by its id.
         *
         * @name Delete Topic
         * @param {string} id - The id of the topic.
         * @return {object} Results contains deleted id. e.g. {"id": "12345"}
         */
        helper.checkPermission(this.request, constants.role.EDITOR);
        var
            topic = yield $getTopic(id),
            reply_ids = yield warp.$query('select id from replies where topic_id=?', [id]);
        yield topic.$destroy();
        yield warp.$update('delete from replies where topic_id=?', [id]);
        yield warp.$update('update boards set topics = topics - 1 where id=?', [topic.board_id]);
        unindexDiscuss(topic);
        unindexDiscussByIds(reply_ids);
        this.body = {
            id: id
        };
    },

    'POST /api/topics/:id/replies': function* (id) {
        /**
         * Create a reply to a topic.
         *
         * @param {string} id: The id of topic.
         * @param {string} content: The content of reply.
         * @return {object} The reply object.
         */
        helper.checkPermission(this.request, constants.role.SUBSCRIBER);
        var data = this.request.body;
        json_schema.validate('createReply', data);
        this.body = yield $createReply(this.request.user, id, data);
    }

};
