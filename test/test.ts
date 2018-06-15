import "reflect-metadata";

import * as Benalu from "benalu";
import * as Chai from "chai";

import {
    AutoFactory,
    AutoFactoryComponentModel,
    ComponentModel,
    Container,
    DependencyGraphAnalyzer,
    inject,
    InstanceComponentModel,
    TypeComponentModel,
} from "../src/ioc-container";

describe("DependencyGraphAnalyzer", () => {
    it("Should identify proper registered components", () => {
        class LCDScreen { }
        @inject.constructor()
        class Monitor {
            constructor(screen: LCDScreen) { }
        }
        class Keyboard {}
        class Mouse{}
        @inject.constructor()
        class Computer {
            constructor(monitor: Monitor, extensionMonitor:Monitor, keyboard:Keyboard, mouse:Mouse) { }
        }

        const analyzer = new DependencyGraphAnalyzer([
            new TypeComponentModel(Keyboard),
            new TypeComponentModel(Mouse),
            new TypeComponentModel(LCDScreen),
            new TypeComponentModel(Monitor),
            new TypeComponentModel(Computer)
        ])
        Chai.expect(analyzer.analyze(Computer)).undefined
    })

    it("Should OK with other type of component model than TypeComponentModel", () => {
        class LCDScreen { }
        @inject.constructor()
        class Monitor {
            constructor(@inject.name("LCD") screen: any) { }
        }
        @inject.constructor()
        class Computer {
            constructor(@inject.name("MonitorFactory") monitor: any) { }
        }

        const analyzer = new DependencyGraphAnalyzer([
            new InstanceComponentModel(new LCDScreen(), "LCD"),
            new AutoFactoryComponentModel(Monitor, "MonitorFactory"),
            new TypeComponentModel(Computer, "Computer")
        ])
        Chai.expect(analyzer.analyze(Computer)).undefined

    })

    it("Should identify non registered component", () => {
        const analyzer = new DependencyGraphAnalyzer([])
        Chai.expect(() => analyzer.analyze("MyComponent")).throws("Trying to resolve MyComponent but MyComponent is not registered in container")
    })

    it("Should identify non registered component in depth dependency", () => {
        class LCDScreen { }
        @inject.constructor()
        class Monitor {
            constructor(screen: LCDScreen) { }
        }
        @inject.constructor()
        class Computer {
            constructor(monitor: Monitor) { }
        }

        const analyzer = new DependencyGraphAnalyzer([
            //LCDScreen not registered
            new TypeComponentModel(Monitor),
            new TypeComponentModel(Computer)
        ])
        Chai.expect(() => analyzer.analyze(Computer)).throws("Trying to resolve Computer -> Monitor -> LCDScreen but LCDScreen is not registered in container")
    })

    it("Should identify circular dependency", () => {
        @inject.constructor()
        class LCDScreen {
            constructor(@inject.name("Computer") computer: any) { }
        }
        @inject.constructor()
        class Monitor {
            constructor(screen: LCDScreen) { }
        }
        @inject.constructor()
        class Computer {
            constructor(monitor: Monitor) { }
        }

        const analyzer = new DependencyGraphAnalyzer([
            new TypeComponentModel(LCDScreen),
            new TypeComponentModel(Monitor),
            new TypeComponentModel(Computer, "Computer")
        ])
        Chai.expect(() => analyzer.analyze("Computer")).throws("Circular dependency detected on: Computer -> Monitor -> LCDScreen -> Computer")
    })

    it("Should skip analysis of already analyzed component", () => {
        @inject.constructor()
        class LCDScreen {
            constructor(@inject.name("Computer") computer: any) { }
        }
        @inject.constructor()
        class Monitor {
            constructor(screen: LCDScreen) { }
        }
        @inject.constructor()
        class Computer {
            constructor(monitor: Monitor) { }
        }

        const lcdComp = new TypeComponentModel(LCDScreen)
        lcdComp.analyzed = true
        const analyzer = new DependencyGraphAnalyzer([
            lcdComp,
            new TypeComponentModel(Monitor),
            new TypeComponentModel(Computer, "Computer")
        ])
        Chai.expect(analyzer.analyze("Computer")).undefined
    })
})

describe("Container", () => {
    it("Should able resolve basic constructor injection", () => {
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

    it("Should be able to resolve type with default constructor which uses base class constructor", () => {
        class Processor { }
        @inject.constructor()
        class Computer {
            constructor(public processor: Processor) { }
        }
        class AppleComputer extends Computer { }
        const container = new Container();
        container.register(Processor)
        container.register(AppleComputer)
        const computer = container.resolve(AppleComputer)
        Chai.expect(computer instanceof Computer).true
        Chai.expect(computer instanceof AppleComputer).true
        Chai.expect(computer.processor instanceof Processor).true
    })

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

    it("Should able to register and resolve interface/named type", () => {
        interface Processor { }
        class Intel implements Processor { }
        interface Keyboard { }
        class Logitech implements Keyboard { }
        class LGMonitor { }
        @inject.constructor()
        class Computer {
            constructor(
                @inject.name("Processor") public processor: Processor,
                public monitor: LGMonitor,
                @inject.name("Keyboard") public keyboard: Keyboard) { }
        }
        const container = new Container();
        container.register("Processor").asType(Intel)
        container.register("Keyboard").asType(Logitech)
        container.register(LGMonitor)
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
        let count = 0;
        container.register(Computer)
            .onCreated(instance => Benalu.fromInstance(instance)
                .addInterception(i => {
                    if (i.memberName == "start") {
                        count++
                        console.log("Before starting computer...")
                        i.proceed()
                        count++
                        console.log("Computer ready")
                    }
                }).build())
        const computer = container.resolve(Computer)
        computer.start()
        Chai.expect(computer instanceof Computer).true
        Chai.expect(count).eq(2)
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
            Chai.expect(() => container.resolve(Computer)).throw("Trying to resolve Computer but Computer is not registered in container")
        })

        it("Should inform if a named type not registered in the container", () => {
            const container = new Container()
            Chai.expect(() => container.resolve("Computer")).throw("Trying to resolve Computer but Computer is not registered in container")
        })

        it("Should inform circular dependency", () => {
            @inject.constructor()
            class LCDScreen {
                constructor(@inject.name("Computer") computer: any) { }
            }
            @inject.constructor()
            class Monitor {
                constructor(screen: LCDScreen) { }
            }
            @inject.constructor()
            class Computer {
                constructor(monitor: Monitor) { }
            }
            const container = new Container()
            container.register(LCDScreen)
            container.register(Monitor)
            container.register("Computer").asType(Computer)
            Chai.expect(() => container.resolve("Computer")).throws("Circular dependency detected on: Computer -> Monitor -> LCDScreen -> Computer")
        })
    })
})
