import { Promise } from "es6-shim";

export class HelloWorld {
    private hi: string = "Hello world!";

    public greet() {
        console.log(this.hi);
        return Promise.resolve(this.hi);
    }
}
