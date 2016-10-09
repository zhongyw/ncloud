'use strict';

// define constants:

module.exports = {
    // user role:
    role: {
        ADMIN:       0,
        EDITOR:      10,
        CONTRIBUTOR: 100,
        SUBSCRIBER:  10000,
        GUEST:       100000000
    },
    type: {
        NORMAL: 0,
        ASK: 10
    },
    signin: {
        LOCAL: 'local'
    },

    // cache keys:
    cache: {
        INDEXMODEL: 'INDEX-MODEL',
        NAVIGATIONS: '__navigations__',
        WEBSITE: '__website__',
        SNIPPETS: '__snippet__',
        SETTINGS: '__settings__'
    },

    // queue name:
    QUEUE_SNS: 'queueSNS',

    // END:
    END: 'ended.'
};
