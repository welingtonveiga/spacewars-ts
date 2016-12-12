import { Promise } from "es6-shim";
import {Observable} from "@reactivex/rxjs";

export class Game {

    static starsCount : number = 100;
    static starsSpeed : number = 40;
    static enemyFreq : number = 1500;
    static enemyShootFrequency : number = 1500;
    static speed : number = 40;
    static shootingSpeed : number = 15;

    constructor (readonly scene: Scene) {}

    public play() : void {

        let heroStream = this.heroStream();

        Observable.combineLatest( this.startStream(), heroStream, this.enemyStream(), this.heroShooting(heroStream),
            (stars, spaceship, enemies, heroShot) =>  {
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
        let posY = this.scene.height - 30;
        let hero = new Hero(this.scene.width/2, posY);
        return  Observable.fromEvent(this.scene.canvas, 'mousemove')
            .map((e:MouseEvent) => hero.move(e.clientX, this.scene.height - 30))
            .startWith(hero);
    }

    private enemyStream() : Observable<Enemy[]> {
        return Observable.interval(Game.enemyFreq)
                .map(()=> {
                    let enemy = new Enemy(Random.next(this.scene.width), -30);
                    Observable.interval(Game.enemyShootFrequency)
                        .subscribe(() => enemy.attack(Game.shootingSpeed, this.scene));
                    return enemy;
                })
                .scan((acc, curr) => {acc.push(curr); return acc;}, [])
                .map((enemies)=> {
                    enemies = enemies.filter((enemy)=>enemy.isVisible(this.scene));
                    enemies.forEach((enemy)=> enemy.move());
                    return enemies;
                })

    }

    private heroShooting(heroStream: Observable<Hero>) : Observable<any> {

        let playerFiring : Observable<any> =Observable.fromEvent(this.scene.canvas,'click')
            .sampleTime(200)
            .timestamp()
            .startWith({});

        return Observable.combineLatest(playerFiring, heroStream, (shotEvent, hero) => {
            return {hero: hero, shot: shotEvent}
        }).distinctUntilChanged(null, (e) => {
            return e.shot.timestamp;
        })
          .scan((e)=> {
              let hero = <Hero> (e.hero!=null?e.hero:e);
              return hero.attack(Game.shootingSpeed, this.scene);
        } );
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

abstract class SpaceObject implements Drawable {

    constructor(protected x:number, protected y:number, private width:number, private color:string, readonly direction: string){}

    drawTo(canvas: CanvasRenderingContext2D) {
        canvas.fillStyle = this.color;
        canvas.beginPath();
        canvas.moveTo(this.x - this.width, this.y);
        canvas.lineTo(this.x, this.direction === 'up'? this.y - this.width : this.y + this.width);
        canvas.lineTo(this.x + this.width, this.y);
        canvas.lineTo(this.x - this.width, this.y);
        canvas.fill();
    }

    isVisible(scene: Scene): boolean {
        return this.x > -40 && this.x < scene.width + 40 &&
         	    this.y > -40 && this.y < scene.height + 40;
    }

    checkColision(object : SpaceObject) : boolean {
        return (this.x > object.x - 20 && this.x < object.x + 20) && (this.y > object.y - 20 && this.y < object.y + 20);
    }
}

class Shot  extends SpaceObject {

    constructor(x:number, y:number, private speed: number, direction: string){
        super(x, y, 5, "#FFFF00", direction);
    }

    move() : void {
        let move = this.speed;
        if (this.direction == 'up') {
            move *= -1;
        }
        this.y += move;
    }

    hit(object: SpaceObject): boolean {
        return this.checkColision(object);
    }
}

class SpaceShip extends SpaceObject {

    private shots : Shot[] = [];
    private dead : boolean = false;

    constructor(x:number, y:number, width:number, color:string, direction: string){
        super(x, y, width, color, direction);
    }

    attack(shotSpeed : number, scene: Scene) : SpaceShip {
        this.shots.push(new Shot(this.x, this.y, shotSpeed, this.direction));
        this.shots = this.shots.filter((s)=>s.isVisible(scene));
        return this;
    }

    drawTo(canvas: CanvasRenderingContext2D) {
        super.drawTo(canvas);
        this.shots.forEach(shot => {
           shot.move();
           shot.drawTo(canvas);
        });
    }

    isDead(): boolean {
        return this.dead;
    }
}

class Hero extends SpaceShip {
    constructor(x:number, y:number){
        super(x, y, 25, "#FF0000", "up");
    }

    move(x: number, y:number) : Hero {
        this.x = x;
        this.y = y;
        return this;
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