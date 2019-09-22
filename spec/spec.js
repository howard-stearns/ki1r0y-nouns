/*global describe, it, require*/
"use strict";
var kilroy = require('ki1r0y-nouns');
var Rule = require('ki1r0y-rules');

describe('Ki1r0y', function () {
    function construction(instance, constructor) {
        describe('construction', function () {
            it('has expected constructor', function () {
                expect(constructor).toBe(instance.constructor);
            });
            it('has expected prototype', function () {
                expect(constructor.prototype).toBe(Object.getPrototypeOf(instance));
            });
        });
    }
    describe('Noun', function () {
        var nounProperties = {
            title: 'my title',
            keytag: 'my key', 
            nametags: ['third name', 'fourth name', 'fifth name', 'sixth name', 'seventh name'],
            description: "some description"
        };
        var noun1 = new kilroy.Noun(nounProperties),
            noun2 = new kilroy.Noun(nounProperties);
        construction(noun1, kilroy.Noun);
        function checkNounProperties(noun1, noun2) {
            describe('Noun properties', function () {
                it('creates unique instances for same properties', function () {
                    expect(noun1).not.toBe(noun2);
                });
                it('preserves at least four additional nametags', function () {
                    expect(noun1.nametags[3]).toBeDefined();
                });
                it('has title', function () {
                    expect(noun1.title).toBe(nounProperties.title);
                });
                it('has keytag', function () {
                    expect(noun1.keytag).toBe(nounProperties.keytag);
                });
                it('has description', function () {
                    expect(noun1.description).toBe(nounProperties.description);
                });
                it('has idtag', function () {
                    expect(noun1.idtag).toBeDefined();
                });
            });
        }
        checkNounProperties(noun1, noun2);
        function copyProperties(from, to) { Object.assign(to, from); }
        describe('Owner', function () {
            var ownerProperties = {
                guid: 'a'
            };
            copyProperties(nounProperties, ownerProperties);
            var owner1 = new kilroy.Owner(ownerProperties),
                owner2 = new kilroy.Owner(ownerProperties);
            construction(owner1, kilroy.Owner);
            function checkOwnerProperties(owner1, owner2) {
                checkNounProperties(owner1, owner2);
            }
            checkOwnerProperties(owner1, owner2);
            describe('User', function () {
                var userProperties = {
                };
                copyProperties(nounProperties, userProperties);
                copyProperties(ownerProperties, userProperties);
                var user1 = new kilroy.User(userProperties),
                    user2 = new kilroy.User(userProperties);
                construction(user1, kilroy.User);
                checkOwnerProperties(user1, user2);
            });
            describe('Team', function () {
                var teamProperties = {
                };
                copyProperties(nounProperties, teamProperties);
                copyProperties(ownerProperties, teamProperties);
                var team1 = new kilroy.Team(teamProperties),
                    team2 = new kilroy.Team(teamProperties);
                construction(team1, kilroy.Team);
                checkOwnerProperties(team1, team2);
            });
        });
        describe('Item', function () {
            var itemProperties = {
                ownertag: '234'
            };
            copyProperties(nounProperties, itemProperties);
            var item1 = new kilroy.Item(itemProperties),
                item2 = new kilroy.Item(itemProperties);
            function checkItemProperties(item1, item2) {
                describe('Item properties', function () {
                    checkNounProperties(item1, item2);
                });
            }
            construction(item1, kilroy.Item);
            checkItemProperties(item1, item2);
            describe('Place', function () {
                var placeProperties = {
                    guid: 'b'
                };
                copyProperties(nounProperties, placeProperties);
                copyProperties(itemProperties, placeProperties);
                var place1 = new kilroy.Place(placeProperties),
                    place2 = new kilroy.Place(placeProperties);
                construction(place1, kilroy.Place);
                checkItemProperties(place1, place2);
            });
            describe('Thing', function () {
                var thingProperties = {
                };
                copyProperties(nounProperties, thingProperties);
                copyProperties(itemProperties, thingProperties);
                var thing1 = new kilroy.Thing(thingProperties),
                    thing2 = new kilroy.Thing(thingProperties);
                construction(thing1, kilroy.Thing);
                checkItemProperties(thing1, thing2);
                it('idtag of identical things are the same', function (done) {
                    Promise.all([thing1.idtag, thing2.idtag]).then(() => {
                        expect(thing1.idtag).toBe(thing2.idtag);
                        done();
                    });
                });
            });
        });
    });
    describe('pickling', () => {
        it('unplickles simple pojo', () => {
            const pojo = {title: 'a title', description: "a description"};
            const noun = new kilroy.Noun(pojo);
            expect(noun instanceof kilroy.Noun).toBeTruthy();
            expect(noun.title).toBe(pojo.title);
            expect(noun.description).toBe(pojo.description);
            expect(noun.idtag).toBeDefined();
        });            
        it('respects type', () => {
            const pojo = {title: 'a title', description: "a description", type: 'Thing'};
            const noun = new kilroy.Noun(pojo);
            expect(noun instanceof kilroy.Thing).toBeTruthy();
            expect(noun.title).toBe(pojo.title);
            expect(noun.description).toBe(pojo.description);
            expect(noun.idtag).toBeDefined();
        });
        it('round trips', (done) => {
            const data = Rule.rulify({
                spec: () => ({title: 'a title', description: "a description", type: 'Thing'}),
                thing1: self => new kilroy.Noun(self.spec),
                thing2: self => new kilroy.Noun({idtag: self.thing1.idtag}),
                idtag2: self => self.thing2.idtag
            });
            data.idtag2.then(() => {
                expect(data.thing2 instanceof kilroy.Thing).toBeTruthy();
                expect(data.thing2.title).toBe(data.spec.title);
                expect(data.thing2.description).toBe(data.spec.description);
                expect(data.thing1.idtag).toBe(data.thing2.idtag);
                done();
            });
        });
    });
});
