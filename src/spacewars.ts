import { Promise } from "es6-shim";
import {Observable} from "@reactivex/rxjs";

export class Game {

    static starsCount : number = 100;
    static starsSpeed : number = 40;
    static enemyFreq : number = 1500;
    static speed : number = 40;

    constructor (readonly scene: Scene) {}

    public play() : void {
        Observable.combineLatest( this.startStream(), this.heroStream(), this.enemyStream(),
            (stars, spaceship, enemies) =>  {
                let drawables : Drawable[] = [];
                stars.forEach((star)=> drawables.push(star));
                enemies.forEach((enemy)=> drawables.push(enemy));
                drawables.push(spaceship);
                return drawables;
            })
            .sampleTime(Game.speed)
            .subscribe((drawables)=>{
                this.scene.update(drawables);
        });
    }

    private startStream() : Observable<Star[]> {
        return Observable.range(1, Game.starsCount)
            .map( () => new Star(Random.next(this.scene.width), Random.next(this.scene.height), Random.next(3)+1))
            .toArray()
            .flatMap((stars) => Observable
                .interval(Game.starsSpeed).map(() => stars.map((star => star.fallUntil(this.scene.height))))
            );
    }

    private heroStream() : Observable<Hero> {
        return  Observable.fromEvent(this.scene.canvas, 'mousemove')
            .map((e:MouseEvent) => new Hero(e.clientX, this.scene.height - 30))
            .startWith(new Hero(this.scene.width, this.scene.height - 30));
    }

    private enemyStream() : Observable<Enemy[]> {
        return Observable.interval(Game.enemyFreq)
                .map(()=> new Enemy(Random.next(this.scene.width), -30))
                .scan((acc, curr) => {acc.push(curr); return acc;}, [])
                .map((enemies)=> {
                    enemies.forEach((enemy)=> enemy.move());
                    return enemies;
                })

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

    constructor(protected x:number, protected y:number, private width:number, private color:string, private direction: string){}

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

class Hero extends SpaceShip {
    constructor(x:number, y:number){
        super(x, y, 25, "#FF0000", "up");
    }
}

class Enemy extends SpaceShip {
    constructor(x:number, y:number){
        super(x, y, 20, "#0000FF", "down");
    }

    move() : void {
        this.y += 5;
        this.x += Random.next(30)-15;
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