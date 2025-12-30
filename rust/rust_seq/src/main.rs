use serde::{Deserialize, Serialize};
use std::env;
use std::process;
use unix_ipc::{channel, Bootstrapper, Receiver, Sender};
use std::io::{stdin,stdout,Write};

const ENV_VAR: &str = "SEQ_IPC_PROCESS";

#[derive(Serialize, Deserialize, Debug)]
pub enum Task {
    Sum(Vec<i64>, Sender<i64>),
    test(Sender<i64>),
    Shutdown,
}

fn main() {
    if let Ok(path) = env::var(ENV_VAR) {
        let receiver = Receiver::<Task>::connect(path).unwrap();
        loop {
            let task = receiver.recv().unwrap();
            match dbg!(task) {
                Task::Sum(values, tx) => {
                    tx.send(values.into_iter().sum::<i64>()).unwrap();
                }
                Task::test(tx) => {
                    tx.send(1i64).unwrap();
                }
                Task::Shutdown => break,
            }
        }
    } else {
        println!("socket not found")
    }



    // env::set_var(ENV_VARX, "VALUE");
    // assert_eq!(env::var(ENV_VARX), Ok("VALUE".to_string()));
    

    //     let bootstrapper = Bootstrapper::new().unwrap();
    //     println!("Bootstrapper path 1: {}",bootstrapper.path().display());
    //     // let mut child = process::Command::new(env::current_exe().unwrap())
    //     //     .env(ENV_VAR, bootstrapper.path())
    //     //     .spawn()
    //     //     .unwrap();
        
    //     let mut node_child = process::Command::new("node");
    //     node_child.arg("FireSequencer.js");
    //     println!("4");
    //     node_child.env(ENV_VAR,bootstrapper.path());
    //     println!("5");
    //     node_child.current_dir("/home/pi/nodeMidi/");
    //     println!("6");
    //     node_child.spawn().expect("failed");
    //     println!("7");

    //     let mut s = String::new();
    //     stdin().read_line(&mut s);


    //     let receiver = Receiver::<Task>::connect(bootstrapper.path()).expect("failed 4");
    //     println!("1");
    //     loop {
    //         println!("12");
    //         let task = receiver.recv().expect("failed 3");
    //         println!("11");
    //         match task {
    //             Task::Sum(values, tx) => {
    //                 println!("2");
    //                 tx.send(values.into_iter().sum::<i64>()).unwrap();
    //             }
    //             Task::Shutdown => break,
    //         }
    //     }
    //     println!("3");

    //     // let (tx, rx) = channel().unwrap();    
    //     // bootstrapper.send(Task::Sum(vec![23, 42], tx)).unwrap();
    //     // println!("result: {}", rx.recv().unwrap());

    //     // let (tx, rx) = channel().unwrap();
    //     // bootstrapper.send(Task::Sum((0..10).collect(), tx)).unwrap();
    //     // println!("result: {}", rx.recv().unwrap());
        
    //     // let mut s = String::new();
    //     // stdin().read_line(&mut s);

    //     bootstrapper.send(Task::Shutdown).unwrap();

    //     // node_child.kill().ok();
    //     // node_child.wait().ok();
}