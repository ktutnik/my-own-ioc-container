import * as Chai from "chai"
import "reflect-metadata"
import * as Benalu from "benalu"
import { Container, inject, ComponentModel, AutoFactory, ComponentModelModifier } from "../src/ioc-container";

describe("Container", () => {

    it("Should resolve with scope Transient/Singleton properly", () => {
        class Wife { }
        class Child { }
        const container = new Container()
        container.register(Wife).singleton()
        container.register(Child)
        const wife = container.resolve(Wife)
        const child = container.resolve(Child)
        Chai.expect(container.resolve(Wife)).eq(wife)
        Chai.expect(container.resolve(Child)).not.eq(child)
    })

    it("Should able to register and resolve type", () => {
        class Processor { }
        class Keyboard { }
        class Monitor { }
        @inject.constructor()
        class Computer {
            constructor(public processor: Processor, public keyboard: Keyboard, public monitor: Monitor) { }
        }
        const container = new Container();
        container.register(Processor)
        container.register(Keyboard)
        container.register(Monitor)
        container.register(Computer)
        const computer = container.resolve(Computer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.processor instanceof Processor).true
        Chai.expect(computer.monitor instanceof Monitor).true
        Chai.expect(computer.keyboard instanceof Keyboard).true
    })

    it("Should able to register and resolve interface/named type", () => {
        interface Processor { }
        class Intel implements Processor { }
        interface Keyboard { }
        class Logitech implements Keyboard { }
        interface Monitor { }
        class LGMonitor implements Monitor { }
        @inject.constructor()
        class Computer {
            constructor(
                @inject.name("Processor") public processor: Processor,
                @inject.name("Keyboard") public keyboard: Keyboard,
                @inject.name("Monitor") public monitor: Monitor) { }
        }
        const container = new Container();
        container.register("Processor").asType(Intel)
        container.register("Keyboard").asType(Logitech)
        container.register("Monitor").asType(LGMonitor)
        container.register(Computer)
        const computer = container.resolve(Computer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.processor instanceof Intel).true
        Chai.expect(computer.monitor instanceof LGMonitor).true
        Chai.expect(computer.keyboard instanceof Logitech).true
    })

    it("Should resolve instance properly", () => {
        interface Monitor { }
        class LGMonitor implements Monitor { }
        @inject.constructor()
        class Computer {
            constructor(@inject.name("Monitor") public monitor: Monitor) { }
        }
        const container = new Container();
        container.register("Monitor").asInstance(new LGMonitor())
        container.register(Computer)
        const computer = container.resolve(Computer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.monitor instanceof LGMonitor).true
    })

    it("Should resolve instance with callback", () => {
        class RetinaDisplay { }
        interface Monitor { display: RetinaDisplay }
        class LGMonitor implements Monitor {
            constructor(public display: RetinaDisplay) { }
        }
        @inject.constructor()
        class Computer {
            constructor(@inject.name("Monitor") public monitor: Monitor) { }
        }
        const container = new Container();
        container.register(RetinaDisplay)
        container.register("Monitor").asInstance(kernel => new LGMonitor(kernel.resolve(RetinaDisplay)))
        container.register(Computer)
        const computer = container.resolve(Computer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.monitor instanceof LGMonitor).true
        Chai.expect(computer.monitor.display instanceof RetinaDisplay).true
    })

    it("Should be able to resolve auto factory", () => {
        class Computer { }
        const container = new Container();
        container.register(Computer)
        container.register("AutoFactory<Computer>").asAutoFactory(Computer)
        const computerFactory = container.resolve<AutoFactory<Computer>>("AutoFactory<Computer>")
        const computer = computerFactory.get()
        Chai.expect(computer instanceof Computer).true
    })

    it("Auto factory should respect component registration life style", () => {
        class Wife { }
        class Child { }
        const container = new Container()
        container.register(Wife).singleton()
        container.register(Child)
        container.register("AutoFactory<Wife>").asAutoFactory(Wife)
        container.register("AutoFactory<Child>").asAutoFactory(Child)
        const wife = container.resolve(Wife)
        const child = container.resolve(Child)
        const wifeFactory = container.resolve<AutoFactory<Wife>>("AutoFactory<Wife>")
        const childFactory = container.resolve<AutoFactory<Child>>("AutoFactory<Child>")
        Chai.expect(container.resolve(Wife)).eq(wife)
        Chai.expect(container.resolve(Child)).not.eq(child)
        Chai.expect(wifeFactory.get()).eq(wife)
        Chai.expect(childFactory.get()).not.eq(child)
    })

    it("Should be able to provide hook when component created", () => {
        class Computer { price = 2000 }
        const container = new Container();
        container.register(Computer).onCreated(x => {
            x.price = 4000;
            return x
        })
        const computer = container.resolve(Computer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.price).eq(4000)
    })

    it("Should be able to provide hook for named type", () => {
        class Computer { price = 2000 }
        const container = new Container();
        container.register("Computer").asType(Computer).onCreated(x => {
            x.price = 4000;
            return x
        })
        const computer = container.resolve<Computer>("Computer")
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.price).eq(4000)
    })

    it("Should be able to provide hook for named instance", () => {
        class Computer { price = 2000 }
        const container = new Container();
        container.register("Computer").asInstance(new Computer()).onCreated(x => {
            x.price = 4000;
            return x
        })
        const computer = container.resolve<Computer>("Computer")
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer.price).eq(4000)
    })

    it("Should be able to provide hook for auto factory", () => {
        class Computer { price = 2000 }
        const container = new Container();
        container.register(Computer)
        container.register("ComputerFactory").asAutoFactory(Computer).onCreated(x => {
            return x
        })
        const factory = container.resolve<AutoFactory<Computer>>("ComputerFactory")
        Chai.expect(factory.get() instanceof Computer).true
    })

    it("Should be able to use Benalu as interception", () => {
        class Computer {
            start() {
                console.log("Starting......")
            }
        }
        const container = new Container();
        container.register(Computer)
            .onCreated(instance => Benalu.fromInstance(instance)
                .addInterception(i => {
                    if(i.memberName == "start"){
                        console.log("Before starting computer...")
                        i.proceed()
                        console.log("Computer ready")
                    }
                }).build())
        const computer = container.resolve(Computer)
        computer.start()
    })

    describe("Error Handling", () => {
        it("Should throw error if no resolver found for a kind of ComponentModel", () => {
            const container = new Container()
            container.register(<ComponentModel>{ kind: "NotAKindOfComponent", name: "TheName", scope: "Transient" })
            Chai.expect(() => container.resolve("TheName")).throws("No resolver registered for component model kind of NotAKindOfComponent")
        })

        it("Should inform if a type not registered in the container", () => {
            class Computer { }
            const container = new Container()
            Chai.expect(() => container.resolve(Computer)).throw("Trying to resolve type of Computer, but its not registered in the container")
        })

        it("Should inform if a named type not registered in the container", () => {
            const container = new Container()
            Chai.expect(() => container.resolve("Computer")).throw("Trying to resolve Computer, but its not registered in the container")
        })

        it("Should inform if type that has parameterized constructor but has lack of @inject.constructor() decorator", () => {
            class LGMonitor { }
            class Computer {
                constructor(public monitor: LGMonitor) { }
            }
            const container = new Container();
            container.register(LGMonitor)
            container.register(Computer)
            Chai.expect(() => container.resolve(Computer)).throws("Computer class require @inject.constructor() to get proper constructor parameter types")
        })
    })
})
