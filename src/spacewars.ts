import { Promise } from "es6-shim";
import {Observable} from "@reactivex/rxjs";

export class Game {

    static starsCount : number = 100;
    static starsSpeed : number = 40;

    constructor (readonly scene: Scene) {}

    public play() : void {
        Observable.combineLatest( this.getStartStream(), this.getSpaceShipStream(),
            (stars, spaceship) =>  {
                let drawables : Drawable[] = [];
                stars.forEach((star)=> drawables.push(star));
                drawables.push(spaceship);
                return drawables;
            }).subscribe((drawables)=>{
                this.scene.update(drawables);
        });
    }

    private getStartStream() : Observable<Array<Star>> {
        return Observable.range(1, Game.starsCount)
            .map( () => new Star(Random.next(this.scene.width), Random.next(this.scene.height), Random.next(10)+1))
            .toArray()
            .flatMap((stars) => Observable
                .interval(Game.starsSpeed).map(() => stars.map((star => star.fallUntil(this.scene.height))))
            );
    }

    private getSpaceShipStream() : Observable<SpaceShip> {
        return  Observable.fromEvent(this.scene.canvas, 'mousemove')
            .map((e:MouseEvent) => new SpaceShip(e.clientX, this.scene.height - 30, 25, "#FF0000", "up"))
            .startWith(new SpaceShip(this.scene.width, this.scene.height - 30, 25, "#FF0000", "up"));
    }
}

export interface Drawable {
    drawTo(canvas: CanvasRenderingContext2D);
}

class Star implements Drawable {

    constructor(private x:number, private y:number, readonly size:number){}

    public fallUntil(limit: number) : Star {
        this.y += this.size;
        if (this.y > limit) {
            this.y = 0;
        }
        return this;
    }

    drawTo(canvas: CanvasRenderingContext2D) {
        canvas.fillStyle = '#fff';
        canvas.fillRect(this.x, this.y, this.size, this.size);
    }
}

class SpaceShip implements Drawable {

    constructor(private x:number, private y:number, private width:number, private color:string, private direction: string){}

    drawTo(canvas: CanvasRenderingContext2D) {
        canvas.fillStyle = this.color;
        canvas.beginPath();
        canvas.moveTo(this.x - this.width, this.y);
        canvas.lineTo(this.x, this.direction === 'up'? this.y - this.width : this.y + this.width);
        canvas.lineTo(this.x + this.width, this.y);
        canvas.lineTo(this.x - this.width, this.y);
        canvas.fill();
    }
}

export class Scene {
    private context: CanvasRenderingContext2D;
    readonly width : number;
    readonly height : number;

    constructor (readonly canvas: HTMLCanvasElement) {
        this.context = canvas.getContext("2d");
        this.width = canvas.width;
        this.height = canvas.height;
    }

    drawBackground() {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.width, this.height);
    }

    draw(drawable : Drawable) {
        drawable.drawTo(this.context);
    }


    update(drawables : Drawable[]) {
        this.drawBackground();
        drawables.forEach((drawable) => this.draw(drawable));
    }
}

class Random {
    static next(max : number) : number {
        return Math.floor(Math.random() * max);
    }
}