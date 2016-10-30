'use strict';

// navigation api

var
    _ = require('lodash'),
    db = require('../../../db'),
    api = require('../../../api'),
    cache = require('../../../cache'),
    helper = require('../../../helper'),
    config = require('../../../config'),
    constants = require('../../../constants'),
    json_schema = require('../../../json_schema');

var
    Navigation = db.navigation,
    warp = db.warp,
    next_id = db.next_id;

function* $getNavigation(id) {
    var navigation = yield Navigation.$find(id);
    if (navigation === null) {
        throw api.notFound('Navigation');
    }
    return navigation;
}

function* $getNavigations() {
    var navs = yield Navigation.$findAll({
        order: 'display_order'
    }), navRoots = [];
    _.each(navs, function(nav){
        if(!nav.parent_id) navRoots.push(nav);
    });
    _.each(navRoots, function(navRoot){
        navRoot.childs = [];
        _.each(navs, function(nav){
            if(nav.parent_id === navRoot.id) navRoot.childs.push(nav);
        });
    });
    return navRoots;
}

function* $getNavigationMenus() {
    var
        apiNames = ['categoryApi', 'articleApi', 'wikiApi', 'webpageApi', 'discussApi', 'attachmentApi', 'userApi', 'settingApi'],
        apis = _.filter(
            _.map(apiNames, function (name) {
                return require('./' + name);
            }), function (api) {
                return api.hasOwnProperty('$getNavigationMenus');
            }),
        menus = [],
        i;
    for (i = 0; i < apis.length; i ++) {
        menus = menus.concat(yield apis[i].$getNavigationMenus());
    }
    return menus;
}

module.exports = {

    $getNavigation: $getNavigation,

    $getNavigations: $getNavigations,

    'GET /api/navigations/:id': function* (id) {
        /**
         * Get categories by id.
         *
         * @name Get Category
         * @param {string} id: The id of the category.
         * @return {object} Category object.
         */
        this.body = yield $getNavigation(id);
    },

    'GET /api/navigations/all/menus': function* () {
        /**
         * Get all navigation menus.
         *
         * @name Get NavigationMenus
         * @return {object} Result like {"navigationMenus": [navigation array]}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = {
            navigationMenus: yield $getNavigationMenus()
        };
    },

    'GET /api/navigations': function* () {
        /**
         * Get all navigations.
         *
         * @name Get Navigations
         * @return {object} Result like {"navigations": [navigation array]}
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        this.body = {
            navigations: yield $getNavigations()
        };
    },

    'POST /api/navigations': function* () {
        /**
         * Create a navigation.
         *
         * @name Create Navigation
         * @param {string} name: The name of the navigation.
         * @param {string} url: The URL of the navigation.
         * @return {object} The navigation object.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            name,
            url,
            parent_id,
            num,
            data = this.request.body;
        json_schema.validate('createNavigation', data);
        name = data.name.trim();
        url = data.url.trim();
        parent_id = data.parent_id.trim();
        num = yield Navigation.$findNumber('max(display_order)');
        this.body = yield Navigation.$create({
            name: name,
            url: url,
            parent_id : parent_id,
            display_order: (num === null) ? 0 : num + 1
        });
        yield cache.$remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/:id': function* (id) {
        /**
         * Update a category.
         *
         * @name Update Category
         * @param {string} id - The id of the navigation.
         * @param {string} [name] - The new name of the navigation.
         * @param {string} [description] - The new description of the navigation.
         * @return {object} Category object that was updated.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var
            props = [],
            navigation,
            data = this.request.body;
        json_schema.validate('updateNavigation', data);
        navigation = yield $getNavigation(id);
        if (data.name) {
            navigation.name = data.name.trim();
            props.push('name');
        }
        if (data.url) {
            navigation.url = data.url.trim();
            props.push('url');
        }

        navigation.parent_id = data.parent_id.trim();
        props.push('parent_id');

        if (props.length > 0) {
            props.push('updated_at');
            props.push('version');
            yield navigation.$update(props);
        }
        this.body = navigation;
    },

    'POST /api/navigations/all/sort': function* () {
        /**
         * Sort navigations.
         *
         * @name Sort Navigations
         * @param {array} id: The ids of the navigation.
         * @return {object} The sort result like {"sort":true}.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var data = this.request.body;
        json_schema.validate('sortNavigations', data);
        this.body = {
            navigations: yield helper.$sort(data.ids, yield $getNavigations())
        };
        yield cache.$remove(constants.cache.NAVIGATIONS);
    },

    'POST /api/navigations/:id/delete': function* (id) {
        /**
         * Delete a navigation.
         *
         * @name Delete Navigation
         * @param {string} id: The id of the navigation.
         * @return {object} The deleted navigation id like {"id":"123"}.
         */
        helper.checkPermission(this.request, constants.role.ADMIN);
        var navigation = yield $getNavigation(id);
        yield navigation.$destroy();
        this.body = {
            id: id
        };
        yield cache.$remove(constants.cache.NAVIGATIONS);
    }
};
