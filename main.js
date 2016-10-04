/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils = require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.ivr.0
var adapter = utils.adapter('ivr');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});


// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function main() {


    adapter.setObject('VoiceVar', {
        type: 'state',
        common: {
            name: 'VoiceVar',
            type: 'string',
            role: 'text',
            read: true,
            write: true
        },
        native: {}
    });

    adapter.setObject('ValArr', {
        type: 'state',
        common: {
            name: 'ValArr',
            type: 'string',
            role: 'text',
            read: true,
            write: true
        },
        native: {}
    });


    // in this ivr all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    // // same thing, but the state is deleted after 30s (getState will return null afterwards)
    // adapter.setState('testVariable', {val: true, ack: true, expire: 30});

}
// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
   // adapter.log.info(id + " -test- " + state.val);


    // adapter.log.info('config : ' + JSON.stringify(adapter.config.units));
    if (state && !state.ack && state.val) {
        if (id === adapter.namespace + '.VoiceVar') {
            sayIt(state.val);

            var lower = state.val.toLowerCase();
            var word = lower.split(' ');
            adapter.log.info(word);

            var z = adapter.config.units;


            var txts = "";

            for (var key in z) {
                var untrignum = [];
                // перебор юнитов

                for (var prop in z[key]) {
                    word.forEach(function (item, n) {//слова
                        //	adapter.log.info('к слову |'+item+'| ищем тригер |'+z[key][prop].triger);
 						if (z[key][prop].triger.length > 1){                        
						var sintrig = z[key][prop].triger.split('|');//синонимы

								sintrig.forEach(function (sinitem, x) {
											if (item.includes(sinitem)) {//добавить номер юнита если  в слове есть вхождение синонима
												untrignum.push(z[key][prop].id);
											adapter.log.info('к слову |'+item+'| тригер |'+sinitem+" id=" + z[key][prop].id);	
									}
								});
						}

                    });


                }
                txts += key + ',';

                var val;//todo перенести в юнит
                if (lower.includes("вклю")) {
                    val = 1;
                }
                if (lower.includes("выклю")) {
                    val = 0;
                }


                for (var prop in z[key]) {

                    if (z[key][prop].wtriger !== 'undefined' || z[key][prop].wtriger !== '')
                        if (testArr(untrignum, z[key][prop].wtriger.split(','))) {//чистим мусор
                            adapter.log.info(z[key][prop].id + ' wtriger ' + z[key][prop].wtriger);
                            txts += z[key][prop].wtriger + ',';//-уйдет в морду для подсветки

                            adapter.setForeignState(z[key][prop].s_var, val, function (err) {// устанавливаем переменные
                                if (err) adapter.log.error(err);
                            });


                        }
                }
                txts += ';';
            }


            adapter.setState('ValArr', {val: txts, ack: false, expire: 30});
            adapter.log.info('stateChange ' + adapter.namespace + ' ' + JSON.stringify(state));

        }
    }


});
function testArr(a, b) {
    if (a == 'undefined' || b == '' || b == 'undefined' || a == '')return false;
    if (a.length < b.length) {//b = [a, a = b][0];
  return false;
	} //swap  

    for (var i = 0, length = a.length; i < length; i++) {
        if (-1 === b.indexOf(a[i])) {
            return false;
        }
    }
    adapter.log.info('testArr a=' + a + '   b=' + b);
    return true;
}


function sayIt(text) {


    //noinspection JSUnresolvedVariable
    //   if (!text || !adapter.config.sayitInstance) return;

    //noinspection JSUnresolvedVariable,JSUnresolvedFunction
    adapter.setForeignState(adapter.config.setup.TTSe, text, function (err) {
        if (err) adapter.log.error(err);
    });
}