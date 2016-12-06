import { HelloWorld } from "./spacewars";

describe("Pessoa", () => {

    it("quando a idade é nula getIdade deve retornar 18", (done) => {
        let h = new HelloWorld();
        h.greet().then((greeting) => {
            expect(greeting).toBe("Hello world!");
            done();
        }).catch((error) => done.fail());
    });


});
