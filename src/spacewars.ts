import {Observable} from "@reactivex/rxjs";

/**
 *  The game abstraction itself, who generates the element streams,
 *  combining them each turn and drawing these elements on the scene.
 */
export class Game {

    static starsCount : number = 100;
    static starsSpeed : number = 40;
    static enemyFreq : number = 1500;
    static enemyShootFrequency : number = 2500;
    static speed : number = 40;
    static shootingSpeed : number = 10;

    constructor (readonly scene: Scene) {}

    public play() : void {

        let hero = this.heroStream();
        let stars = this.startStream();
        let enemies = this.enemyStream();

        Observable.combineLatest(stars, hero, enemies, this.combineGameElements(new Score()))
            .sampleTime(Game.speed)
            .map(this.runTurn)
            .map((elements) => elements.asDrawables())
            .subscribe((drawables) => this.scene.update(drawables));
    }

    private combineGameElements( score: Score) :  ( stars: Star[], hero : SpaceShip, enemies:Enemy[]) => GameElements {
        return ( stars: Star[], hero : SpaceShip, enemies:Enemy[]) => new GameElements(stars, hero, enemies, score);
    }

    private runTurn(elements : GameElements) : GameElements {
        if (!elements.score.isGameOver()) {
            let hero = elements.spaceship;
            elements.enemies.forEach(enemy => {
                if (enemy.kill(hero))
                    elements.score.setGameOver();
                if (hero.kill(enemy))
                    elements.score.hit();
            });
        }
        return elements;
    }


    private startStream() : Observable<Star[]> {
        let stars = Observable.range(1, Game.starsCount)
            .map(() => Star.randomGenerateAt(this.scene))
            .toArray();

        let movingStarsStream = (stars) => Observable
            .interval(Game.starsSpeed)
            .map(() => stars.map((star => star.fallUntil(this.scene.height))));

        return stars.flatMap(movingStarsStream);
    }

    private heroStream() : Observable<Hero> {

        let hero = Hero.createAt(this.scene);

        let movement =  Observable.fromEvent(this.scene.canvas, 'mousemove')
            .map((e:MouseEvent) => hero.move(e.clientX, this.scene.height - 30))
            .startWith(hero);

        let firing : Observable<any> =Observable.fromEvent(this.scene.canvas,'click')
            .sampleTime(200)
            .timestamp()
            .startWith({});

        return Observable.combineLatest(movement, firing, (hero,shotEvent) => {
            return {hero: hero, shot: shotEvent}
        }).distinctUntilChanged(null, (e) => {
            return e.shot.timestamp;
        }).map((e) => {
            return <Hero> (e.hero!=null?e.hero:e);
        }).scan((hero)=> {
            return hero.attack(Game.shootingSpeed, this.scene);
        } );
    }

    private enemyStream() : Observable<Enemy[]> {

        let combineWithShooting = (enemy) => {
            Observable.interval(Game.enemyShootFrequency)
                .filter(()=> Random.next(10)>5)
                .subscribe(() => enemy.attack(Game.shootingSpeed, this.scene));
            return enemy;
        };

        let addMovement = (enemies)=> {
            let stillOnGame = (enemy) =>enemy.isVisible(this.scene) && !enemy.isDead();
            enemies = enemies.filter(stillOnGame);
            enemies.forEach((enemy)=> enemy.move());
            return enemies;
        };

        let addToGame = (acc, curr) => {
            acc.push(curr);
            return acc;
        };

        return Observable.interval(Game.enemyFreq)
                .map(()=>new Enemy(Random.next(this.scene.width), -30))
                .map(combineWithShooting)
                .scan(addToGame, [])
                .map(addMovement);
    }

}

/**
 *  Each game element should be drawable, to draw itself on the game scene.
 */
export interface Drawable {
    drawTo(scene : Scene);
}

/**
 *  The scene draws the game background, the game elements on the canvas,
 *  and exposes useful information like the canvas context and his dimensions.
 */
export class Scene {
    readonly context: CanvasRenderingContext2D;
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
        drawable.drawTo(this);
    }

    update(drawables : Drawable[]) {
        this.drawBackground();
        drawables.forEach((drawable) => this.draw(drawable));
    }
}

/**
 *  Holder for game elements.
 */
class GameElements {

    constructor(readonly stars: Star[],
                readonly spaceship: SpaceShip,
                readonly enemies: Enemy[],
                readonly score: Score) {
    }

    public asDrawables() : Drawable[] {
        let drawables : Drawable[] = [].concat(this.stars);

        if (!this.score.isGameOver()) {
            drawables = drawables.concat(this.enemies);
            drawables.push(this.spaceship);
        }

        drawables.push(this.score);

        return drawables;
    }
}

/**
 *  Stars used to give 'movement' for game.
 */
class Star implements Drawable {

    static randomGenerateAt(scene: Scene) : Star {
        return new Star(Random.next(scene.width), Random.next(scene.height), Random.next(3)+1);
    }

    constructor(private x:number, private y:number, readonly size:number){}

    public fallUntil(limit: number) : Star {
        this.y += this.size;
        if (this.y > limit) {
            this.y = 0;
        }
        return this;
    }

    drawTo(scene: Scene) {
        let canvas : CanvasRenderingContext2D = scene.context;
        canvas.fillStyle = '#fff';
        canvas.fillRect(this.x, this.y, this.size, this.size);
    }
}

/**
 *  Common behaviors and characteristics for objects with triangular shapes on game, like spaceships and shots.
 */
abstract class SpaceObject implements Drawable {

    constructor(protected x:number, protected y:number, private width:number, private color:string, readonly direction: string){}

    drawTo(scene: Scene) {
        let canvas : CanvasRenderingContext2D = scene.context;
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

    checkCollision(object : SpaceObject) : boolean {
        return (this.x > object.x - 20 && this.x < object.x + 20) && (this.y > object.y - 20 && this.y < object.y + 20);
    }
}

/**
 *  Base class for game spaceships.
 */
class SpaceShip extends SpaceObject {

    private shots : Shot[] = [];
    private dead : boolean = false;

    constructor(x:number, y:number, width:number, color:string, direction: string){
        super(x, y, width, color, direction);
    }

    attack(shotSpeed : number, scene: Scene) : SpaceShip {
        if (!this.isDead()){
            this.shots.push(new Shot(this.x, this.y, shotSpeed, this.direction));
            this.shots = this.shots.filter((s)=>s.isVisible(scene));
        }
        return this;
    }

    drawTo(scene: Scene) {
        if (!this.isDead()) {
            super.drawTo(scene);
        }
        this.shots.forEach(shot => {
           shot.move();
           shot.drawTo(scene);
        });
    }

    kill(object: SpaceShip) : boolean {
        let killed = false;
        if (!object.dead && this.shots.some((shot) => shot.hit(object))) {
            object.setDead();
            killed = true;
        }
        return killed;
    }

    setDead(): void {
        this.dead = true;
    }

    isDead(): boolean {
        return this.dead;
    }
}

/**
 *  The hero specializations of spaceships, with particular appearance, directions and movement.
 */
class Hero extends SpaceShip {

    static createAt(scene : Scene) {
        let posY = scene.height - 30;
        return new Hero(scene.width/2, posY);
    }

    constructor(x:number, y:number){
        super(x, y, 25, "#FF0000", "up");
    }

    move(x: number, y:number) : Hero {
        this.x = x;
        this.y = y;
        return this;
    }
}

/**
 *  The enemy specializations of spaceships, with particular appearance, directions and movement.
 */
class Enemy extends SpaceShip {
    constructor(x:number, y:number){
        super(x, y, 20, "#0000FF", "down");
    }

    move() : void {
        this.y += 5;
        this.x += Random.next(30)-15;
    }
}

/**
 *  The shot abstractions.
 */
class Shot extends SpaceObject {

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
        return this.checkCollision(object);
    }
}

/**
 *  The scores table abstraction, handling rules for player score points, game finish and feedback.
 */
class Score implements Drawable {

    public static increment: number = 5;

    private score : number = 0;

    private gameOver : boolean = false;

    hit() : void {
        this.score += Score.increment;
    }

    setGameOver() : void {
        this.gameOver = true;
    }

    isGameOver() : boolean {
        return this.gameOver;
    }

    drawTo(scene: Scene) {
        let canvas : CanvasRenderingContext2D = scene.context;

        canvas.fillStyle = '#ffffff';
        canvas.font = 'bold 26px sans-serif';
        canvas.fillText('Score: ' + this.score, 40, 43);

        if (this.gameOver) {
            canvas.fillStyle = '#ffff00';
            canvas.font = 'bold 48px sans-serif';
            let textWidth = 280;
            canvas.fillText('Game Over :(', scene.width / 2 - textWidth /2, scene.height/2);

            canvas.font = 'bold 24px sans-serif';
            let textHeight = 24;
            canvas.fillText('Reload and try again...', scene.width / 2 - textWidth/2, scene.height/2 + textHeight*2);
        }
    }

}

class Random {
    static next(max : number) : number {
        return Math.floor(Math.random() * max);
    }
}