# How Its Work

Basically all IoC Container consist of two main big part: Registration part and Resolution part. Registration part convert registered type into component model, resolution part analyze the component model dependency graph and convert component model into type instance. 

> NOTE
> 
> below explanation and code snippet intended to be as simple as possible to easier for you to understand. In the real implementation of My Own IoC Container is a lot more robust and extensible than that but still easy to understand.

## Registration 

For example we have classes below, and register it in the container.

```typescript
//classes
interface Monitor {}
class LGMonitor implements Monitor { }
class PowerSupply {}
class Computer {
    constructor(
        //inject by name (interface injection)
        @inject.name("Monitor") private monitor:Monitor
        //inject by type
        private power:PowerSupply){ }
}

//registration
container.register("Monitor").asType(LGMonitor)
container.register(PowerSupply)
container.register(Computer)
```

Registration part will convert above class into a Component Models like below

```typescript
[{
    kind: "Type",
    name: "Monitor"
    type: LGMonitor,
    lifeStyle: "Transient",
    dependencies: []
}, {
    kind: "Type",
    //the name is auto generated, because registered by type
    //name will be used as a key on singleton cache
    name: "auto:PowerSupply"
    type: PowerSupply,
    lifeStyle: "Transient",
    dependencies: []
}, {
    kind: "Type",
    name: "auto:Computer"
    type: Computer,
    lifeStyle: "Transient",
    //list of constructor parameters, 
    //for more advanced scenario can be list of properties for property injection
    //note that dependencies only contain the Name or Type of the
    //dependent type, further we use recursion to resolve them
    dependencies: ["Monitor", PowerSupply]
}]
```

`kind` of component model used to differentiate how the component will be instantiated. Some IoC container have several registration kind: Register by type, register by instance, register for auto factory etc etc. Each registration kind has different resolving logic.

## Resolution
Resolution part consist of two part: dependency graph analysis and resolution. Dependency graph analysis needed to catch issues that hard to trace like: 
* A type dependent to another type that is not registered in the container
* A type contains circular dependency
* A type registration causing [captive dependency](http://blog.ploeh.dk/2014/06/02/captive-dependency/)

I will not explain the dependency graph analysis part because its not important part, you can check the [Topological Sort](https://en.wikipedia.org/wiki/Topological_sorting) for basic understanding of the analysis.

We continue to resolution part, when your code asks for resolution like below:

```typescript
const computer = container.resolve(Computer)
```

The resolution part do perform operation like below

```typescript
//array of component model comes from registration
let componentModels = []
//object to store singleton cache
let singletonCache = {}

function resolve(request){
    if(typeof request == "string")
        resolveModel(componentModels.filter(x => x.name == request)[0])
    else 
        resolveModel(componentModels.filter(x => x.type == type)[0])
}

function resolveModel(model){
    const instance = new model.type(...model.dependencies.map(x => resolve(x)))
    if(model.lifeStyle == "Singleton"){
        const cache = singletonCache[model.name]
        if(!cache) return singletonCache[model.name] = instance
        else return cache
    }
    else return instance
}
```

Above code is simplified version of resolution part, in real implementation it needs more robust and extensible implementation. 

The most important part of above implementation is the instantiation process 

```typescript
const instance = new model.type(...model.dependencies.map(x => resolve(x)))
```

Above code will create instance of the requested type and resolve the parameter recursively. For example if we request the `Computer` class, the component model is like be below:

```typescript
{
    kind: "Type",
    name: "auto:Computer"
    type: Computer,
    lifeStyle: "Transient",
    dependencies: ["Monitor", PowerSupply]
}
```

So the instantiation process `new model.type()` is the same as `new Computer()`. then we recursively resolve the `model.dependencies` that is `"Monitor"` and `PowerSupply` then assigned them as the parameter of the `Computer` object using spread `...` operator.

