/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/
var cordova = require('../cordova'),
    path    = require('path'),
    shell   = require('shelljs'),
    fs      = require('fs'),
    util    = require('../src/util'),
    config    = require('../src/config'),
    lazy_load = require('../src/lazy_load'),
    Q = require('q'),
    tempDir = path.join(__dirname, '..', 'temp');

describe('create command', function () {
    var mkdir, cp, config_spy, load_cordova, load_custom, exists, config_read, config_write, parser, package, name;
    beforeEach(function() {
        shell.rm('-rf', tempDir);
        mkdir = spyOn(shell, 'mkdir');
        cp = spyOn(shell, 'cp');
        config_spy = spyOn(cordova, 'config');
        config_read = spyOn(config, 'read').andReturn({});
        config_write = spyOn(config, 'write').andReturn({});
        exists = spyOn(fs, 'existsSync').andReturn(false);
        load_cordova = spyOn(lazy_load, 'cordova').andReturn(Q(path.join('lib','dir')));
        load_custom = spyOn(lazy_load, 'custom').andReturn(Q(path.join('lib','dir')));
        package = jasmine.createSpy('config.packageName');
        name = jasmine.createSpy('config.name');
        parser = spyOn(util, 'config_parser').andReturn({
            packageName:package,
            name:name
        });
    });

    describe('failure', function() {
        it('should return a help message if incorrect number of parameters is used', function(done) {
            this.after(function() {
                cordova.removeAllListeners('results');
            });
            cordova.on('results', function(h) {
                expect(h).toMatch(/synopsis/gi);
                done();
            });
            cordova.raw.create();
        });
    });

    describe('success', function() {
        it('should create top-level directory structure appropriate for a cordova-cli project', function(done) {
            cordova.raw.create(tempDir).then(function() {
                expect(mkdir).toHaveBeenCalledWith(path.join(tempDir, 'platforms'));
                expect(mkdir).toHaveBeenCalledWith(path.join(tempDir, 'merges'));
                expect(mkdir).toHaveBeenCalledWith(path.join(tempDir, 'plugins'));
                expect(mkdir).toHaveBeenCalledWith(path.join(tempDir, 'www'));
                done();
            });
        });
        it('should create hooks directory', function(done) {
            var hooks_dir = path.join(tempDir, 'hooks');
            cordova.raw.create(tempDir).then(function() {
                expect(mkdir).toHaveBeenCalledWith(hooks_dir);
                expect(cp).toHaveBeenCalledWith(
                    path.resolve(__dirname, '..', 'templates', 'hooks-README.md'),
                    jasmine.any(String)
                );
                done();
            });
        });
        it('should by default use cordova-app-hello-world as www assets', function(done) {
            cordova.raw.create(tempDir).then(function() {
                expect(load_cordova).toHaveBeenCalledWith('www');
                done();
            });
        });
        it('should try to lazy load custom www location if specified', function(done) {
            var fake_config = {
                lib:{
                    www:{
                        id:'supercordova',
                        uri:'/supacordoba',
                        version:'1337'
                    }
                }
            };
            config_read.andReturn(fake_config);
            config_write.andReturn(fake_config);
            cordova.raw.create(tempDir, 'some.app.id', 'SomeAppName', fake_config).then(function() {
                expect(load_custom).toHaveBeenCalledWith(fake_config.lib.www.uri, fake_config.lib.www.id, 'www', fake_config.lib.www.version);
                done();
            });
        });
        it('should add a missing www/config.xml', function(done) {
            cordova.raw.create(tempDir).then(function() {
                expect(shell.cp).toHaveBeenCalledWith(
                    path.resolve(__dirname, '..', 'templates', 'config.xml'),
                    jasmine.any(String)
                );
                done();
            });
        });
        it('should not replace an existing www/config.xml', function(done) {
            exists.andCallFake(function(p) {
                if (p.indexOf('config.xml') > -1) return true;
                return false;
            });
            cordova.raw.create(tempDir).then(function() {
                expect(shell.cp).not.toHaveBeenCalledWith(
                    path.resolve(__dirname, '..', 'templates', 'config.xml'),
                    jasmine.any(String)
                );
                done();
            });
        });
    });
});
