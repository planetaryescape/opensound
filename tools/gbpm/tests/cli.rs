use serde_json::{json, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::TempDir;

fn ffmpeg(args: &[&str]) {
    let output = Command::new("ffmpeg")
        .args(["-hide_banner", "-loglevel", "error"])
        .args(args)
        .output()
        .expect("FFmpeg must be installed to test gbpm");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

fn probe(path: &Path) -> Value {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_streams",
            "-show_format",
            "-of",
            "json",
        ])
        .arg(path)
        .output()
        .expect("ffprobe must be installed to test gbpm");
    assert!(output.status.success());
    serde_json::from_slice(&output.stdout).unwrap()
}

#[test]
fn cli_produces_audio_and_video_with_and_without_a_supplied_intro() {
    let temp = TempDir::new().unwrap();
    let directory = temp.path().join("fixture with spaces");
    fs::create_dir(&directory).unwrap();
    let audio = directory.join("mix.wav");
    let intro = directory.join("intro.wav");
    let cover = directory.join("cover.jpg");
    ffmpeg(&[
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:sample_rate=48000",
        "-t",
        "2",
        audio.to_str().unwrap(),
    ]);
    ffmpeg(&[
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:sample_rate=48000",
        "-t",
        "0.25",
        intro.to_str().unwrap(),
    ]);
    ffmpeg(&[
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=320x180",
        "-frames:v",
        "1",
        cover.to_str().unwrap(),
    ]);

    for format in ["mp3", "mp4"] {
        for with_intro in [false, true] {
            let output_name = format!("output-{with_intro}.{format}");
            let mut job = json!({
                "audioPath": "mix.wav",
                "imagePath": "cover.jpg",
                "title": "Night Mix",
                "description": "# Tracklist\nArtist - Track",
                "outputFormat": format,
                "outputPath": output_name,
            });
            if with_intro {
                job["introPath"] = json!("intro.wav");
                job["artist"] = json!("Artist");
                job["album"] = json!("Collection");
                job["genre"] = json!("Ambient");
            }
            let job_path = directory.join("job.json");
            fs::write(&job_path, serde_json::to_vec(&job).unwrap()).unwrap();
            let output = Command::new(env!("CARGO_BIN_EXE_gbpm"))
                .args(["--job", job_path.to_str().unwrap()])
                .output()
                .unwrap();
            assert!(
                output.status.success(),
                "{}",
                String::from_utf8_lossy(&output.stderr)
            );
            let output_path = directory.join(output_name);
            assert_eq!(
                String::from_utf8(output.stdout).unwrap().trim(),
                output_path.to_str().unwrap()
            );
            let media = probe(&output_path);
            let streams = media["streams"].as_array().unwrap();
            let audio_stream = streams
                .iter()
                .find(|stream| stream["codec_type"] == "audio")
                .unwrap();
            assert_eq!(
                audio_stream["codec_name"],
                if format == "mp3" { "mp3" } else { "aac" }
            );
            let video = streams
                .iter()
                .find(|stream| stream["codec_type"] == "video")
                .unwrap();
            if format == "mp4" {
                assert_eq!(video["codec_name"], "h264");
                assert_eq!(video["width"], 1920);
                assert_eq!(video["height"], 1080);
            } else {
                assert_eq!(video["disposition"]["attached_pic"], 1);
                if with_intro {
                    assert_eq!(media["format"]["tags"]["album"], "Collection");
                    assert_eq!(media["format"]["tags"]["genre"], "Ambient");
                } else {
                    assert!(media["format"]["tags"]["album"].is_null());
                    assert!(media["format"]["tags"]["genre"].is_null());
                }
            }
        }
    }
}
