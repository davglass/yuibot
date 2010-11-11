#!/usr/bin/env node

var sys = require('sys'),
    jerk = require('./jerk/lib/jerk'),
    Google = require('./google/google'),
    mysql_client = require('mysql').Client,
    mysql = new mysql_client(),
    YUI3 = require('./yui3-docs').YUI3,
    // Google
    google = new Google(),
    config = require('./config').config;


mysql.user = config.mysql.username;
mysql.password = config.mysql.password;
mysql.database = config.mysql.db;
mysql.connect();


jerk(function(j) {
  
    j.watch_for(/^(?:hi|hello|hey)$/i, function( message ) {
        message.say( message.user + ": oh hai!" )
    });

    j.watch_for( /^(?:it )?doesn(?:')?t work(?:\s*@\s*([-\[\]|_\w]+))?/, function( message ) {
        message.say( to( message, "doesn't work" ) + ": What do you mean it doesn't work?  What happens when you try to run it?  What's the output?  What's the error message?  Saying \"it doesn't work\" is pointless." )
    });
  
    j.watch_for( /^g(?:oogle)? ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]|_\w]+))?$/, function( message ) {
        var user = to( message, 3 ),
            res  = +message.match_data[2]-1 || 0;

            google.search( message.match_data[1], function( results ) {
                if ( results.length ) {
                    message.say( user + ": " + results[res].titleNoFormatting + " - " + results[res].unescapedUrl );
                } else { 
                    message.say( user + ": Sorry, no results for '" + message.match_data[1] + "'" );
                }
            });
    });
  
    j.watch_for( /^mdc ([^#@]+)(?:\s*#([1-9]))?(?:\s*@\s*([-\[\]|_\w]+))?$/, function( message ) {
        var user = to( message, 3 ),
            res  = +message.match_data[2]-1 || 0;

        google.search( message.match_data[1] + ' site:developer.mozilla.org', function( results ) {
            if ( results.length ) {
                message.say( user + ": " + results[res].titleNoFormatting + " - " + results[res].unescapedUrl );
            } else {
                message.say( user + ": Sorry, no results for '" + message.match_data[1] + "'" );
            }
        });
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
            mysql.connect(function() {
                mysql.query("insert into chat (channel, who, utterance) values (?, ?, ?)", [
                    message.source,
                    message.user,
                    message.text[0]
                ]);
            });
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

