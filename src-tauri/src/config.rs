use once_cell::sync::Lazy;
use std::env;

pub struct Config {
    pub args_file_path: String,
}

pub static CONFIG: Lazy<Config> = Lazy::new(|| Config {
    args_file_path: env::var("LAUNCH_ARGS_FILE_PATH").expect("Args file path get error."),
});
