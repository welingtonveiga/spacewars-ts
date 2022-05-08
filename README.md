## Space Wars

[2022 Update] This project was created in 2016, as a learning exercise. It's a simple "clone" of the classic space invaders implemented using RxJS based on the 3rd chapter of the book 'Reactive Programming with RxJS' - but implemented in TypeScript using an Object Oriented approach. 

So, you ask: **Why on Earth would you want to use RxJS with TypeScript and Object Oriented?** - Don't worry, I can explain: The motivation for this reading and study was to deepen my understanding of RxJS and learn how to apply reactive building blocks to Angular 2, which used this stack ¯\\_(ツ)_/¯.

Reviewing it a few years later, I ended up not using much of Angular after AngularJS (A framework named React became mainstream)  - but understanding better RxJS paid dividends in frontend and backend projects as different technologies use the same fundamental concepts.


![spaceship](spaceship.gif)

### How to try

**Pre-requisites:**
* nvm (<https://github.com/nvm-sh/nvm>)

**Coommands:**
```bash
cd <your_worksspace>
git clone https://github.com/welingtonveiga/spacewars
cd clonewars
nvm use
npm i
npm start
```
Then just go to [http://localhost:8080/webpack-dev-server/](http://localhost:8080/webpack-dev-server/), and have fun :)


### Next Steps
* Add levels to the game
* Add new enemies types with distinct behaviour
* Increment game challenge through the levels