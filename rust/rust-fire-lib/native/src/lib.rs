use neon::prelude::*;
use neon::register_module;
use num_bigint::BigUint;
use num_traits::{One, Zero};
use std::mem::replace;
use std::os::unix::net::{UnixStream,UnixListener};
use std::io::{Write,Read};

fn sock_it(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let listener = UnixListener::bind("/tmp/app.nodeMidi2").unwrap();

    match listener.accept() {
        Ok((mut socket, addr)) => {
            println!("Got a client: {:?} - {:?}", socket, addr);
            socket.write_all(b"hello world").unwrap();
            let mut response = String::new();
            socket.read_to_string(&mut response).unwrap();
            println!("{}", response);
        },
        Err(e) => println!("accept function failed: {:?}", e),
    }
    // Ok(())
    Ok(cx.boolean(true))
}

fn hello(mut cx: FunctionContext) -> JsResult<JsString> {
    println!("thing");
    Ok(cx.string("hello node"))
}

fn between(mut cx: FunctionContext) -> JsResult<JsBoolean> {
    let in_num = cx.argument::<JsNumber>(0)?.value();
    let lim_1 = cx.argument::<JsNumber>(1)?.value();
    let lim_2 = cx.argument::<JsNumber>(2)?.value();
    let inclus: bool = cx.argument::<JsBoolean>(3)?.value();
    // println!("{}",inclus);
    Ok(cx.boolean(
        if inclus && lim_1 > lim_2 {
            in_num >= lim_2 && in_num <= lim_1
        } else if !inclus && lim_1 > lim_2 {
            in_num > lim_2 && in_num < lim_1
        } else if inclus && lim_1 < lim_2 {
            in_num >= lim_1 && in_num <= lim_2
        } else if !inclus && lim_1 < lim_2 {
            in_num > lim_1 && in_num < lim_2
        } else {
            false
        }
    ))
}


fn compute(n: usize) -> BigUint {
    let mut f0: BigUint = Zero::zero();
    let mut f1: BigUint = One::one();
    for _ in 0..n {
        let f2 = f0 + &f1;
        // This is a low cost way of swapping f0 with f1 and f1 with f2.
        f0 = replace(&mut f1, f2);
    }
    f0
}

struct FibonacciTask {
    argument: usize,
}

impl Task for FibonacciTask {
    type Output = BigUint;
    type Error = ();
    type JsEvent = JsString;

    fn perform(&self) -> Result<BigUint, ()> {
        Ok(compute(self.argument))
    }

    fn complete(self, mut cx: TaskContext, result: Result<BigUint, ()>) -> JsResult<JsString> {
        Ok(cx.string(result.unwrap().to_str_radix(10)))
    }
}

fn fibonacci_async(mut cx: FunctionContext) -> JsResult<JsUndefined> {
    let n = cx.argument::<JsNumber>(0)?.value() as usize;
    let cb = cx.argument::<JsFunction>(1)?;

    let task = FibonacciTask { argument: n };
    task.schedule(cb);

    Ok(cx.undefined())
}



register_module!(mut cx, {
    cx.export_function("fibonacci", fibonacci_async)?;
    cx.export_function("hello", hello)?;
    cx.export_function("between",between)?;
    cx.export_function("sock_it",sock_it)?;
    Ok(())
});