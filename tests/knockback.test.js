import { expect, test } from "bun:test";
import { Gryphon, Knight } from "../cards";
import { Card } from "../game";
import { setup } from "./testing";
import { Knockback } from "../actions";

test("knockback moves cards into adjacent tiles", () => {
  let { map, spawn, act } = setup(`ga.`);
  let gryphon = new Card(Gryphon);
  spawn(gryphon, map.g);
  act(new Knockback(gryphon, map.a));
  expect(gryphon.tile.position).toEqual(map.a.position);
});

test("knockback doesn't move cards when they are blocked by other cards", () => {
  let { map, spawn, act } = setup(`gx.`);
  let gryphon = new Card(Gryphon);

  spawn(gryphon, map.g);
  spawn(new Card(Gryphon), map.x);
  act(new Knockback(gryphon, map.x));

  expect(gryphon.tile.position).toEqual(map.g.position);
});

test("knockback deals damage to knocked back cards", () => {
  let { map, spawn, act } = setup(`.gx.`);
  let gryphon = new Card(Gryphon);
  spawn(gryphon, map.g);
  act(new Knockback(gryphon, map.x));
  expect(gryphon.counter).toEqual(gryphon.type.counter - 1);
});

test("knockback damages cards through collisions", () => {
  let { map, spawn, act } = setup(`.kxf.`);
  let k = new Card(Gryphon);
  let f = new Card(Gryphon);
  spawn(k, map.k);
  spawn(f, map.f);
  act(new Knockback(k, map.x));
  expect(k.counter).toEqual(k.type.counter - 1);
  expect(f.counter).toEqual(f.type.counter - 1);
});
