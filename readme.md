# My Own IoC Container 
Dead simple IoC Container that can be hosted in your project code become Your Own IoC Container

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

Then My Own IoC Container is your choice, because My Own IoC Container is Your Own IoC Container. This will be your conversation with your friend:

>> Friend: What IoC Container did you use?<br>
>> You: Its My Own IoC Container
 
Check installation part to make My Own IoC Container become Your Own IoC Container.


## Prerequisites
First prerequisites is you need to understand how My Own IoC Container work, believe me its easier than its look.

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

## Dependency
None

## Installation
Download the `ioc-container.ts` file or copy the raw content of the file and drop it inside your project than you go.

## Features
My Own IoC Container only support a few feature of common IoC Container but enough for you.

* Minimum setup. My Own IoC container doesn't make your code as a "Decorator War", only use decorator when it needed
* Constructor injection
* Inject by type without name or decorator
* Inject by named type, this required when you do interface injection or inject an instance.
* Instance injection and instance injection with callback
* Easy to understand fluent configuration
* (In progress) Auto factory injection, inject factory of specific registered type without specifying the factory implementation.
* (In progress) Interception 

## How to Use It

```typescript
//inject by interface (no decorator needed)
interface Pilot { }
class JohnDoe implements Pilot { }

//inject implementation (no decorator need)
class JetEngine { }

//only need to decorate class with constructor injection
@inject.constructor()
class Plane {
    constructor(
        //only need to decorate interface injection
        @inject.name("Pilot") private pilot:Pilot, 
        //no decorator needed for type injection
        private engine:JetEngine){}
}

const container = new Container()
container.register(JetEngine)
container.register("Pilot").asType(JohnDoe)
container.register(Plane)

const plane = container.resolve(Plane)
```







