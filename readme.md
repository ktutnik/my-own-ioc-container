# My Own IoC Container 
A dead simple IoC Container that can be hosted in your project code become Your Own IoC Container

[![Build Status](https://travis-ci.org/ktutnik/my-own-ioc-container.svg?branch=master)](https://travis-ci.org/ktutnik/my-own-ioc-container)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/my-own-ioc-container/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/my-own-ioc-container?branch=master)


## Motivation
Have you ever created a TypeScript library or application which require an IoC Container to manage dependencies and you are looking for an IoC Container framework to do that, but then you are realize either one of this:

* You want to learn how to create an IoC Container but not sure how to do it.
* You want your library free from dependencies, but still want to manage dependency using IoC Container.
* The size of the IoC Container framework bigger than your project size which makes you unhappy.
* The IoC Container is your competitor's product.
* You think creating IoC Container things is easy and no need as biggie as the frameworks around.
* You afraid of the future of the IoC Container framework, will it go for long time or dead in the near future.
* You only need a few features of the IoC Container and you think no need a framework to do that.

Then My Own IoC Container is your choice, because My Own IoC Container is a very small library that can be copy pasted to your code and became part of your code. 

The name itself designed to make My Own IoC Container become your IoC Container, as your conversation with your friend:

> Friend: What IoC Container did you use?<br>
> You: Its My Own IoC Container

Check installation part to make My Own IoC Container become Your Own IoC Container.


## Prerequisites
First prerequisites is you need to understand how My Own IoC Container work, refer to [How Its Work](how-its-work.md), believe me its easier than you thing.

To use My Own IoC Container required you to use TypeScript with below `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es6",  
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  }
}
```

All above configuration is required.

# Features
My Own IoC Container support most of common IoC Container features:

- [x] Single file, copy - paste able, less then 15kb/300 lines of code
- [x] Supported Singleton and Transient lifestyle (Transient is default)
- [x] Constructor injection
- [x] Inject by type
- [x] Inject by name for interface injection
- [x] Inject instance
- [x] Inject instance with factory function
- [x] Inject Auto factory 
- [x] Component creation hook
- [ ] Collection injection / Multi injection
- [ ] Circular dependency graph analysis

Things that will not supported because it introduce more code base and complexity
* Advanced dependency graph analysis such as captive dependency etc
* Child container
* Built in interception, see how you can implement interception using Benalu [here](#oncreated-hook-and-interception)

# How to Use it

## Installation
Install reflect-metadata on your project

```
npm install reflect-metadata
```

Download or copy the [file](https://raw.githubusercontent.com/ktutnik/my-own-ioc-container/master/src/ioc-container.ts) then drop it inside your project than you go.

## Constructor Injection
Decorate class with `@inject.constructor()` to automatically inject registered type to the constructor parameters. You don't need to specify more configuration, the container has enough information about parameter type of the class as long as you enable the `emitDecoratorMetadata:true` in the `tsconfig.json` file. Keep in mind this automatic type detection only work for parameter of type ES6 classes.

```typescript
import { inject, Container } from "./ioc-container"

class JetEngine { }

@inject.constructor()
class Plane {
    constructor(private engine:JetEngine){}
}

const container = new Container()
container.register(JetEngine)
container.register(Plane)

const plane = container.resolve(Plane)
```

## Constructor Injection on Super Class
If you want to register a class with default constructor (without specifying constructor on the class body) but the constructor itself stays in the base class which is parameterized. You need to decorate the base class with `@inject.constructor()`, registering the baseclass is optional, if you don't need it in the container you can skip registering the baseclass.

```typescript
import { inject, Container } from "./ioc-container"

class JetEngine { }

//the base class has parameterized constructor
@inject.constructor()
abstract class AbstractPlane {
    constructor(private engine:JetEngine){}
}
//the implementation class doesn't specify constructor (default constructor)
class Plane extends AbstractPlane {}

const container = new Container()
container.register(JetEngine)
container.register(Plane)

const plane = container.resolve(Plane)
```

## Interface Injection
Interface injection actually impossible in TypeScript because the interface will be erased after transpile. You can use named injection to do interface injection

```typescript
import { inject, Container } from "./ioc-container"

interface Engine { }
class JetEngine implements Engine { }

@inject.constructor()
class Plane {
    constructor(@inject.name("Engine") private engine:Engine){}
}

const container = new Container()
container.register("Engine").asType(JetEngine)
container.register(Plane)

const plane = container.resolve(Plane)
```

> You can also resolve named type by specifying name of the type `container.resolve("Engine")`
> 

## Instance Injection
Sometime its not possible for you to register type because you need to manually instantiate the type. You can do it like below


```typescript
import { inject, Container } from "./ioc-container"

interface Engine { }
class JetEngine implements Engine { }

@inject.constructor()
class Plane {
    constructor(@inject.name("Engine") private engine:Engine){}
}

const container = new Container()
container.register("Engine").asInstance(new JetEngine())
container.register(Plane)

const plane = container.resolve(Plane)
```

> Keep in mind that instance injection always follow the component lifestyle (transient/singleton)


## Instance Injection with Dynamic Value
Sometime the instance injected need to instantiated when the component resolved not when it registered, example injecting Date to the constructor like below:

```typescript
import { inject, Container } from "./ioc-container"

interface Engine { }
class JetEngine implements Engine {
    constructor(refillTime:Date)
}

@inject.constructor()
class Plane {
    constructor(@inject.name("Engine") private engine:Engine){}
}

const container = new Container()
container.register("Engine").asInstance(x => new JetEngine(new Date()))
container.register(Plane)

const plane = container.resolve(Plane)
```

By providing a function callback, the `new Date()` will be executed exactly after the `Plane` resolved. The x parameter of the callback is of type of `Kernel`, read explanation below for more detail.

## Instance Injection that Depends on Other Component
In some case injecting instance can be difficult, because its depends on other type registered in the container. You can do it like below

```typescript
import { inject, Container } from "./ioc-container"

class Fuel {}
interface Engine { }

class JetEngine implements Engine {
    constructor(private fuel:Fuel)
}

@inject.constructor()
class Plane {
    constructor(@inject.name("Engine") private engine:Engine){}
}

const container = new Container()
container.register(Fuel)
container.register("Engine").asInstance(kernel => new JetEngine(kernel.resolve(Fuel)))
container.register(Plane)

const plane = container.resolve(Plane)
```

## Auto Factory Injection
Creating factory is possible by using instance injection like below

```typescript
import { inject, Kernel, Container } from "./ioc-container"

class Plane { }

class PlaneFactory {
    constructor(private kernel:Kernel){}
    get(){
       this.kernel.resolve(Plane)
    }
}

@inject.constructor()
class PlaneProductionHouse {
    constructor(@inject.name("PlaneFactory") private factory:PlaneFactory){}

    producePlane(){
       const plane = this.factory.get()
    }
}

const container = new Container()
container.register(Plane)
container.register("PlaneFactory").asInstance(kernel => new PlaneFactory(kernel))
container.register(PlaneProductionHouse)

const productionHouse = container.resolve(PlaneProductionHouse)
productionHouse.producePlane()
```

Above implementation makes you creating extra `PlaneFactory` class which has dependency to `Kernel` class which is not good. But by using Auto Factory injection you don't need to create the `PlaneFactory` class manually but the container will inject a factory for free:


```typescript
import { inject, AutoFactory, Container } from "./ioc-container"

class Plane { }

@inject.constructor()
class PlaneProductionHouse {
    constructor(@inject.name("PlaneFactory") private factory:AutoFactory<Plane>){}

    producePlane(){
       const plane = this.factory.get()
    }
}

const container = new Container()
container.register(Plane)
container.register("PlaneFactory").asAutoFactory(Plane)
container.register(PlaneProductionHouse)

const productionHouse = container.resolve(PlaneProductionHouse)
productionHouse.producePlane()
```

TIPS: It is better to register a factory with a more appropriate name like `AutoFactory<Plane>` to make the name injection more unique and appropriate.

```typescript
//registration
container.register("AutoFactory<Plane>").asAutoFactory(Plane)
//injection
constructor(@inject.name("AutoFactory<Plane>") private factory:AutoFactory<Plane>){}
```

> `asAutoFactory` also work with named component by specifying name of the component in the parameter `asAutoFactory("<TheNameOfComponent>")`
> 
> Keep in mind the life style of the type returned by Auto Factory will respect the type registration, if you specify `.singleton()` after the `asAutoFactory()` registration it will become the life style of the Factory not the returned type.

## OnCreated hook and Interception
OnCreated used when you want to modify the instance of the component. With this feature you can make an interception by modify the instance with Proxy. On this example we will use [Benalu 2.0.0-beta-1](http://github.com/ktutnik/benalu) as the proxy library.

```typescript
import * as Benalu from "benalu"
import { Container } from "./ioc-container"

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

/*
--- result:
Before starting computer...
Starting......
Computer ready
*/
```

Above code showing that we intercept the execution of `Computer.start()` method adding console log before and after execution.

> Second parameter of the `onCreated` method is instance of `Kernel`