/// <reference types="es6-shim" />
/// <reference types="jasmine" />

import {Game, Scene} from './spacewars';

export * from "./spacewars";

let  canvas : HTMLCanvasElement = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;

document.body.appendChild(canvas);


new Game(new Scene(canvas)).play();
