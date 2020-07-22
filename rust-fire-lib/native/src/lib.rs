use neon::prelude::*;

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

register_module!(mut cx, {
    cx.export_function("hello", hello);
    cx.export_function("between",between)
});