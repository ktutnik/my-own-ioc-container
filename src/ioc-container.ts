import "reflect-metadata";

/* ------------------------------------------------------------------------------- */
/* --------------------------------- TYPES --------------------------------------- */
/* ------------------------------------------------------------------------------- */

/**
 * Alias for constructor of type of T
 */
export type Class<T> = new (...args: any[]) => T

/**
 * Life time style of component. 
 * Singleton: the same instance returned on each resolve. 
 * Transient: different instance returned on each resolve (default registration)
 */
export type LifetimeScope = "Singleton" | "Transient"

/**
 * Internal use, interface which contains of index and name
 */
interface IndexNameType {
    index: number,
    name: string
}

/**
 * Internal use, Abstraction of resolver type
 */
interface Resolver {
    /**
     * Resolve a registered component model
     * @param config ComponentModel that will be resolved
     */
    resolve<T>(config: ComponentModel): T
}

/**
 * Alias type for ResolverBase constructor
 */
type ResolverConstructor = new (kernel: Kernel, cache: { [key: string]: any }) => Resolver

/**
 * Abstraction of container which only expose resolve<T>() method
 */
export interface Kernel {
    /**
     * Resolve a registered component
     * @param type Type or Name of the component that will be resolved
     */
    resolve<T>(type: Class<T> | string): T
}

/**
 * ComponentModel modifier that will be exposed on fluent registration
 */
export interface ComponentModelModifier {
    /**
     * Set a component model as singletone life style, default lifestyle is transient
     */
    singleton(): ComponentModelModifier
}

/**
 * Abstraction of ComponentModel
 */
export interface ComponentModel {
    kind: string,
    name: string,
    scope: LifetimeScope
}

/* ------------------------------------------------------------------------------- */
/* ----------------------------- CONSTANTS/CACHE --------------------------------- */
/* ------------------------------------------------------------------------------- */

/**
 * Identifier of @inject.name() decorator
 */
const NAME_DECORATOR_KEY = "microwire:named-type"

/**
 * Registry of Resolvers will be used by Container. This constant retrieve value 
 * from @resolver decorator
 */
const RESOLVERS: { [kind: string]: ResolverConstructor } = {}

/* ------------------------------------------------------------------------------- */
/* --------------------------------- HELPERS ------------------------------------- */
/* ------------------------------------------------------------------------------- */

/**
 * Extract metadata of a class/target, and return empty array if no metadata found
 * @param key Key of the metadata
 * @param target Target class which has the metadata
 */
function getMetadata<T>(key: string, target: any) {
    return (<T[]>Reflect.getMetadata(key, target) || [])
}

/**
 * Extract constructor parameters, the result can be Type of TypeName specified by @inject.name() decorator
 * @param target Target type
 */
function getConstructorParameters(target: Class<any>) {
    //get TypeScript generated parameter types for target parameters
    const parameterTypes = getMetadata<Class<any>>("design:paramtypes", target)
    //get target parameter @name decorators
    const decorators = getMetadata<IndexNameType>(NAME_DECORATOR_KEY, target).reverse()
    //the @name decorator has highest priority so return the binding name if the parameter has @name decorator
    return parameterTypes.map((x, i) => {
        const decorator = decorators[i]
        return decorator ? decorator.name : x
    })
}

/* ------------------------------------------------------------------------------- */
/* --------------------------------- DECORATORS ---------------------------------- */
/* ------------------------------------------------------------------------------- */

export namespace inject {
    /**
     * Inject constructor parameters of class with appropriate parameters type instance
     */
    export function constructor() { return (target: any) => { } }

    /**
     * Inject decorated parameter with appropriate type registered by name in container
     * @param name Registered name of the type on the container
     */
    export function name(name: string) {
        return (target: any, propertyName: string, index: number) => {
            const list = getMetadata<IndexNameType>(NAME_DECORATOR_KEY, target).concat([{ index, name }])
            Reflect.defineMetadata(NAME_DECORATOR_KEY, list, target)
        }
    }
}

/**
 * Only for internal use. Register resolver thus automatically added to the Container
 * @param kind Kind of resolver, will automatically match with ComponentModel.kind
 */
function resolver(kind: string) {
    return (target: ResolverConstructor) => {
        RESOLVERS[kind] = target
    }
}



/* ------------------------------------------------------------------------------- */
/* --------------------------------- CONTAINERS ---------------------------------- */
/* ------------------------------------------------------------------------------- */

export abstract class ComponentModelBase implements ComponentModel, ComponentModelModifier {
    abstract kind: string;
    abstract name: string;
    scope: LifetimeScope = "Transient"
    singleton(): ComponentModelModifier {
        this.scope = "Singleton"
        return this
    }
}

export abstract class ResolverBase implements Resolver {
    protected abstract getInstance<T>(typeInfo: ComponentModel): T
    constructor(protected kernel: Kernel, protected cache: { [key: string]: any }) { }
    resolve<T>(config: ComponentModel): T {
        if (config.scope == "Singleton") {
            let cache = this.cache[config.name]
            if (!cache) this.cache[config.name] = cache = this.getInstance(config)
            return cache
        }
        else return this.getInstance(config)
    }
}

export class Container implements Kernel {
    private singletonCache: { [name: string]: any } = {}
    private models: ComponentModel[] = []
    private resolver: { [kind: string]: Resolver } = {}

    constructor() {
        //setup all registered RESOLVERS
        //Resolver should be marked with @resolver decorator 
        Object.keys(RESOLVERS).forEach(x => {
            this.resolver[x] = new RESOLVERS[x](this, this.singletonCache)
        })
    }

    private resolveModel<T>(model: ComponentModel): T {
        const resolver = this.resolver[model.kind]
        if (!resolver) throw new Error(`No resolver registered for component model kind of ${model.kind}`)
        return resolver.resolve(model)
    }

    /**
     * Register named component, the component can be Type, Instance, Factory etc
     * @param name Name of the component
     */
    register<T>(name: string): ComponentRegistrator
    
    /**
     * Register Type, this feature require emitDecoratorMetadata enabled on tsconfig.json
     * @param type: Type that will be registered to the container
     */
    register<T>(type: Class<T>): ComponentModelModifier

    /**
     * Register ComponentModel manually, this feature useful when you define your own Resolver logic
     * @param model ComponentModel that will be registered to the container
     */
    register<T>(model: ComponentModel): void


    register<T>(nameOrComponent: string | Class<T> | ComponentModel): ComponentRegistrator | ComponentModelModifier | void {
        if (typeof nameOrComponent == "string")
            return new ComponentRegistrator(this.models, nameOrComponent)
        else if (typeof nameOrComponent == "object") {
            this.models.push(nameOrComponent)
        }
        else {
            const model = new TypeComponentModel<T>(nameOrComponent)
            this.models.push(model)
            return model
        }
    }

    /**
     * Resolve a registered component
     * @param type Type or Name of the component that will be resolved
     */
    resolve<T>(type: Class<T> | string): T {
        if (typeof type == "string") {
            const model = this.models.filter(x => x.name == type)[0];
            if (!model) throw Error(`Trying to resolve ${type}, but its not registered in the container`)
            return this.resolveModel(model)
        }
        else {
            const model = this.models.filter(x => x.kind == "Type" && x instanceof TypeComponentModel && x.type == type)[0]
            if (!model) throw Error(`Trying to resolve type of ${type.prototype.constructor.name}, but its not registered in the container`)
            return this.resolveModel(model)
        }
    }
}


/* ------------------------------------------------------------------------------- */
/* -------------------------- TYPE INJECTION IMPLEMENTATION ---------------------- */
/* ------------------------------------------------------------------------------- */

export class TypeComponentModel<T> extends ComponentModelBase {
    kind = "Type"
    name: string
    dependencies: (Class<T> | string)[]
    constructor(public type: Class<T>, name?: string) {
        super()
        this.name = name || type.prototype.constructor.name
        this.dependencies = getConstructorParameters(type)
    }
}

@resolver("Type")
export class TypeResolver extends ResolverBase {
    protected getInstance<T>(config: TypeComponentModel<T>): T {
        if (config.type.length > 0 && config.dependencies.length == 0)
            throw new Error(`${config.type.prototype.constructor.name} class require @inject.constructor() to get proper constructor parameter types`)
        return new config.type(...config.dependencies.map(x => this.kernel.resolve(x)))
    }
}


/* ------------------------------------------------------------------------------- */
/* ---------------------- INSTANCE INJECTION IMPLEMENTATION ---------------------- */
/* ------------------------------------------------------------------------------- */

export class InstanceCompnentModel<T> extends ComponentModelBase {
    kind = "Instance"
    constructor(public value: T | ((kernel: Kernel) => T), public name: string) {
        super()
    }
}

@resolver("Instance")
export class InstanceResolver extends ResolverBase {
    protected getInstance<T>(info: InstanceCompnentModel<T>): T {
        if (typeof info.value == "function")
            return info.value(this.kernel)
        else
            return info.value
    }
}

/* ------------------------------------------------------------------------------- */
/* ------------------------- COMPONENT REGISTRATOR ------------------------------- */
/* ------------------------------------------------------------------------------- */

export class ComponentRegistrator {
    constructor(private models: ComponentModel[], private name: string) { }

    asType<T>(type: Class<T>): ComponentModelModifier {
        const model = new TypeComponentModel<T>(type, this.name)
        this.models.push(model)
        return model
    }

    asInstance<T>(instance: T | ((kernel: Kernel) => T)): ComponentModelModifier {
        const model = new InstanceCompnentModel<T>(instance, this.name)
        this.models.push(model)
        return model
    }
}