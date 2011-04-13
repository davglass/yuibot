#!/usr/bin/env node

var sys = require('sys'),
    jerk = require('jerk'),
    Y = require('yui3').useSync('yql');
    mysql_client = require('mysql').Client,
    mysql = new mysql_client(),
    YUI3 = require('./yui3-docs').YUI3,
    config = require('./config').config,
    stripHTML = /<\S[^><]*>/g;


mysql.user = config.mysql.username;
mysql.password = config.mysql.password;
mysql.database = config.mysql.db;
mysql.connect();

//If there is a mysql config function, call it with the mysql connection object
if (config.mysql.config) {
    config.mysql.config(mysql);
}

jerk(function(j) {
  
    j.watch_for(/^(?:hi|hello|hey)$/i, function( message ) {
        message.say( message.user + ": oh hai!" )
    });

    j.watch_for( /^(?:it )?doesn(?:')?t work(?:\s*@\s*([-\[\]|_\w]+))?/, function( message ) {
        message.say( to( message, "doesn't work" ) + ": What do you mean it doesn't work?  What happens when you try to run it?  What's the output?  What's the error message?  Saying \"it doesn't work\" is pointless." )
    });

    j.watch_for( /^yql ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]\{\}`|_\w]+))?$/, function( message ) {
        var user = to( message, 3 ),
            res  = +message.match_data[2]-1 || 0,
            sql = message.match_data[1];

            if (message.match_data[3]) {
                user = to(message, 4);
            }

            Y.YQL(sql, function(r) {
                if (r.query && r.query.results) {
                    message.say(user + ": " + JSON.stringify(r.query.results.result[res]));
                } else {
                    message.say( user + ": YQL Returned no results")
                }
            });

            
    });

    var webSearch = function(message, scope) {
        var user = to( message, 3 ),
            res  = +message.match_data[2]-1 || 0,
            search = message.match_data[1];

            if (message.match_data[3]) {
                user = to(message, 4);
            }
            var sql = 'select title,url from search.web where query="' + escape(search) + '"' + ((scope) ? ' and sites="' + scope + '"' : '');
            console.log('SQL: ', sql);

            Y.YQL(sql, function(r) {
                if (r.query && r.query.results) {
                    var results = r.query.results.result[res];
                    message.say(user + ": " + results.title.replace(stripHTML, '') + ' - ' + results.url);
                } else {
                    message.say( user + ": YQL Returned no results")
                }
            });
    };

    j.watch_for( /^search ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]\{\}`|_\w]+))?$/, webSearch);

    j.watch_for( /^g(?:oogle)? ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]\{\}`|_\w]+))?$/, function( message ) {
        var user = to( message, 3 );
        if (message.match_data[3]) {
            user = to(message, 4);
        }
        message.say( user + ": We don't use Google search here, using Yahoo! Search instead");
        webSearch(message);
    });

    j.watch_for( /^mdc ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]\{\}`|_\w]+))?$/, function( message ) {
        webSearch(message, 'developer.mozilla.org');
    });
  
    j.watch_for( /^api ([$\w]+(?:[\.#]\w+)*)(?:\s+@\s*([-\[\]|_\w]+))?/, function( message ) {
        //console.log(message);
        message.say( to( message, 2 ) + ": Sorry, the `api` command is temporarily disabled." )
    });

    j.watch_for( /^module ([$\w]+(?:[\.#]\w+)*)(?:\s+@\s*([-\[\]|_\w]+))?/, function( message ) {
        //console.log(message);
        var mod = message.match_data[1],
        info = YUI3.modules[mod];

        if (info) {
            message.say( to( message, 2 ) + ": " + mod + ": " + info.description + "." );
            if (info.submodules.length) {
                message.say( to( message, 2 ) + ": " + mod + ": Contains the following submodules: " + info.submodules.join(', ') + "." );
            }
            if (info.classlist) {
                message.say( to( message, 2 ) + ": " + mod + ": Contains the following classes: " + info.classlist.join(', ') + "." );
            }
            
        } else {
            message.say( to( message, 2 ) + ": Could not find a module named: " + mod + "." );
        }
    });

    j.watch_for(/./, function(message) {
        var log = false;
        config.irc.channels.forEach(function(v) {
            if (v === message.source) {
                log = true;
            }
        });
        if (log) {
            mysql.query("insert into chat (channel, who, utterance) values (?, ?, ?)", [
                message.source,
                message.user,
                message.text[0]
            ]);
        }
    });

}).connect( config.irc );


function to(message, def, idx) {
    if ( typeof idx === 'undefined' && typeof def === 'number' ) {
        idx = def, def = null
    } else {
        idx = idx || 1
    }
    return !!message.match_data[idx] ? message.match_data[idx] : def || message.user
}

process.on('uncaughtException', function(e) {
    console.log(e.stack);
});
