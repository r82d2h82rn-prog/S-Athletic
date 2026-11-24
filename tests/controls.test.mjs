import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ForwardDash} from '../src/controls.mjs';

test('a fast released tap followed by a held forward press starts dash until release',()=>{const d=new ForwardDash();d.down('finger1',0);assert(!d.running);d.up('finger1',70);d.down('finger2',180);assert(d.running);d.up('finger2',2000);assert(!d.running);});
test('a single long press does not dash, and keyboard auto-repeat is ignored',()=>{const d=new ForwardDash();d.down('KeyW',0);d.down('KeyW',100);d.down('KeyW',200);assert(!d.running);d.up('KeyW',1500);d.down('KeyW',1560);assert(!d.running);});
test('slow double taps remain normal walking',()=>{const d=new ForwardDash();d.down('p1',0);d.up('p1',50);d.down('p2',350);assert(!d.running);});
test('two simultaneous fingers do not count as two forward taps',()=>{const d=new ForwardDash();d.down('p1',0);d.down('p2',50);assert(!d.running);d.up('p1',100);assert(!d.running);d.up('p2',150);});
test('cancel and modal reset remove both dash and double-tap history',()=>{for(const action of['reset','cancel']){const d=new ForwardDash();d.down('p1',0);d.up('p1',50);d.down('p2',100);assert(d.running);if(action==='reset')d.reset();else d.cancel('p2');assert(!d.running);d.down('p3',150);assert(!d.running);}});
test('keyboard forward double presses use the same dash gesture',()=>{const d=new ForwardDash();d.down('ArrowUp',0);d.up('ArrowUp',60);d.down('ArrowUp',180);assert(d.running);d.up('ArrowUp',400);assert(!d.running);});
test('dash button is removed and the title HUD starts at 100 seconds',()=>{const html=readFileSync(new URL('../first.html',import.meta.url),'utf8');assert(!html.includes('data-action="run"'));assert.match(html,/id="timer">100/);assert.match(html,/2回タッチ/);});
test('the machine challenge has one keyboard-accessible button in the game controls',()=>{const html=readFileSync(new URL('../first.html',import.meta.url),'utf8');assert.equal((html.match(/id="challenge"/g)||[]).length,1);assert.match(html,/<button id="challenge"[^>]*hidden/);assert.match(html,/押すと起動・回転は一周だけ/);});
