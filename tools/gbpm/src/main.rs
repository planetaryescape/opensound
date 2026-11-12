use serde::Deserialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use tempfile::TempDir;

const VERSION: &str = env!("CARGO_PKG_VERSION");

const HELP: &str = "\
gbpm - audio mix and still-image video processor

Usage: gbpm [OPTIONS] <path-to-job.json>

Options:
  -j, --job <path>  Path to job JSON file
  -V, --version     Print version
  -h, --help        Print help
";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobFile {
    audio_path: String,
    image_path: String,
    title: String,
    description: String,
    output_format: String,
    output_path: Option<String>,
    intro_path: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    genre: Option<String>,
}

struct ResolvedJob {
    audio_path: PathBuf,
    image_path: PathBuf,
    output_path: PathBuf,
    intro_path: Option<PathBuf>,
    description: String,
    output_format: String,
    artist: Option<String>,
    album: Option<String>,
    genre: Option<String>,
}

fn parse_args() -> Result<PathBuf, String> {
    let args: Vec<String> = env::args().collect();

    if args.len() == 2 {
        match args[1].as_str() {
            "-V" | "--version" => {
                println!("gbpm {}", VERSION);
                std::process::exit(0);
            }
            "-h" | "--help" => {
                print!("{}", HELP);
                std::process::exit(0);
            }
            _ => {}
        }
        if args[1].starts_with("--job=") {
            return Ok(PathBuf::from(&args[1][6..]));
        }
        return Ok(PathBuf::from(&args[1]));
    }

    if args.len() == 3 && (args[1] == "--job" || args[1] == "-j") {
        return Ok(PathBuf::from(&args[2]));
    }

    Err("Usage: gbpm [--job|-j] <path-to-job.json>".to_string())
}

fn read_job_file(path: &Path) -> Result<JobFile, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read job file: {}", e))?;
    let job: JobFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse job JSON: {}", e))?;

    if job.audio_path.is_empty() {
        return Err("audioPath is required".to_string());
    }
    if job.image_path.is_empty() {
        return Err("imagePath is required".to_string());
    }
    if job.title.is_empty() {
        return Err("title is required".to_string());
    }
    if job.description.is_empty() {
        return Err("description is required".to_string());
    }
    if job.intro_path.as_deref() == Some("") {
        return Err("introPath must not be empty when supplied".to_string());
    }
    if job.output_format != "mp3" && job.output_format != "mp4" {
        return Err("outputFormat must be 'mp3' or 'mp4'".to_string());
    }

    Ok(job)
}

fn to_safe_mix_title(title: &str) -> String {
    title
        .chars()
        .map(|c| {
            if c.is_alphanumeric() {
                c.to_ascii_lowercase()
            } else {
                '_'
            }
        })
        .collect()
}

fn resolve_job_paths(job: JobFile, job_path: &Path) -> ResolvedJob {
    let job_dir = job_path.parent().unwrap_or(Path::new("."));
    let output_path = match job.output_path {
        Some(output) => job_dir.join(output),
        None => job_dir.join(format!(
            "{}.{}",
            to_safe_mix_title(&job.title),
            job.output_format
        )),
    };

    ResolvedJob {
        audio_path: job_dir.join(job.audio_path),
        image_path: job_dir.join(job.image_path),
        output_path,
        intro_path: job.intro_path.map(|path| job_dir.join(path)),
        description: job.description,
        output_format: job.output_format,
        artist: job.artist,
        album: job.album,
        genre: job.genre,
    }
}

fn format_tracklist(description: &str) -> String {
    description
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty() && !trimmed.starts_with('#')
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn build_ffmpeg_args(temp_dir: &Path, job: &ResolvedJob) -> Vec<String> {
    let audio_path = temp_dir.join("audio.mp3");
    let image_path = temp_dir.join("cover.jpg");
    let intro_path = temp_dir.join("intro.wav");
    let output_path = temp_dir.join(format!("output.{}", job.output_format));
    let mut args = Vec::new();

    if job.output_format == "mp3" {
        args.extend(["-i".to_string(), audio_path.to_string_lossy().to_string()]);
        if job.intro_path.is_some() {
            args.extend(["-i".to_string(), intro_path.to_string_lossy().to_string()]);
        }
        args.extend(["-i".to_string(), image_path.to_string_lossy().to_string()]);
        if job.intro_path.is_some() {
            args.extend([
                "-filter_complex".to_string(),
                "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]".to_string(),
            ]);
        }
        args.extend([
            "-c:a".to_string(),
            "libmp3lame".to_string(),
            "-b:a".to_string(),
            "320k".to_string(),
            "-map".to_string(),
            if job.intro_path.is_some() {
                "[a]"
            } else {
                "0:a:0"
            }
            .to_string(),
            "-map".to_string(),
            if job.intro_path.is_some() { "2" } else { "1" }.to_string(),
            "-c:v".to_string(),
            "mjpeg".to_string(),
            "-disposition:v:0".to_string(),
            "attached_pic".to_string(),
        ]);
        for (key, value) in [
            ("artist", &job.artist),
            ("album", &job.album),
            ("genre", &job.genre),
        ] {
            if let Some(value) = value {
                args.extend(["-metadata".to_string(), format!("{}={}", key, value)]);
            }
        }
        let tracklist = format!("Tracklist:\n{}", format_tracklist(&job.description));
        for key in ["description", "comment", "lyrics", "USLT"] {
            args.extend(["-metadata".to_string(), format!("{}={}", key, tracklist)]);
        }
        args.extend(["-id3v2_version".to_string(), "3".to_string()]);
    } else {
        args.extend([
            "-loop".to_string(),
            "1".to_string(),
            "-i".to_string(),
            image_path.to_string_lossy().to_string(),
            "-i".to_string(),
            audio_path.to_string_lossy().to_string(),
        ]);
        if job.intro_path.is_some() {
            args.extend([
                "-i".to_string(),
                intro_path.to_string_lossy().to_string(),
                "-filter_complex".to_string(),
                "[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=2[a]".to_string(),
            ]);
        }
        args.extend([
            "-c:v".to_string(), "libx264".to_string(),
            "-tune".to_string(), "stillimage".to_string(),
            "-c:a".to_string(), "aac".to_string(),
            "-b:a".to_string(), "192k".to_string(),
            "-pix_fmt".to_string(), "yuv420p".to_string(),
            "-shortest".to_string(),
            "-vf".to_string(),
            "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2".to_string(),
            "-map".to_string(), "0:v".to_string(),
            "-map".to_string(),
            if job.intro_path.is_some() { "[a]" } else { "1:a:0" }.to_string(),
        ]);
    }
    args.push(output_path.to_string_lossy().to_string());
    args
}

fn process_mix(job: ResolvedJob) -> Result<PathBuf, String> {
    let audio_data =
        fs::read(&job.audio_path).map_err(|e| format!("Failed to read audio file: {}", e))?;
    let image_data =
        fs::read(&job.image_path).map_err(|e| format!("Failed to read image file: {}", e))?;
    let temp_dir = TempDir::new().map_err(|e| format!("Failed to create temp directory: {}", e))?;

    fs::write(temp_dir.path().join("audio.mp3"), audio_data)
        .map_err(|e| format!("Failed to write temp audio: {}", e))?;
    fs::write(temp_dir.path().join("cover.jpg"), image_data)
        .map_err(|e| format!("Failed to write temp image: {}", e))?;
    if let Some(path) = &job.intro_path {
        let intro_data = fs::read(path).map_err(|e| format!("Failed to read intro file: {}", e))?;
        fs::write(temp_dir.path().join("intro.wav"), intro_data)
            .map_err(|e| format!("Failed to write temp intro: {}", e))?;
    }

    let output = Command::new("ffmpeg")
        .args(build_ffmpeg_args(temp_dir.path(), &job))
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;
    if !output.status.success() {
        return Err(format!(
            "FFmpeg failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let output_data = fs::read(
        temp_dir
            .path()
            .join(format!("output.{}", job.output_format)),
    )
    .map_err(|e| format!("Failed to read output file: {}", e))?;
    if let Some(parent) = job.output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }
    fs::write(&job.output_path, output_data)
        .map_err(|e| format!("Failed to write output file: {}", e))?;
    Ok(job.output_path)
}

fn main() -> ExitCode {
    let result = parse_args().and_then(|path| {
        let job = read_job_file(&path)?;
        process_mix(resolve_job_paths(job, &path))
    });
    match result {
        Ok(path) => {
            println!("{}", path.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{}", error);
            ExitCode::from(1)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn job(format: &str, intro: bool) -> ResolvedJob {
        ResolvedJob {
            audio_path: PathBuf::from("mix.mp3"),
            image_path: PathBuf::from("cover.jpg"),
            output_path: PathBuf::from(format!("result.{}", format)),
            intro_path: intro.then(|| PathBuf::from("intro.wav")),
            description: "# Tracklist\n\nArtist - Track".to_string(),
            output_format: format.to_string(),
            artist: None,
            album: None,
            genre: None,
        }
    }

    fn has_pair(args: &[String], flag: &str, value: &str) -> bool {
        args.windows(2)
            .any(|pair| pair[0] == flag && pair[1] == value)
    }

    #[test]
    fn mp3_without_intro_maps_the_audio_and_cover_without_brand_defaults() {
        let args = build_ffmpeg_args(Path::new("work"), &job("mp3", false));
        assert!(has_pair(&args, "-map", "0:a:0"));
        assert!(has_pair(&args, "-map", "1"));
        assert!(!args.iter().any(|arg| arg == "-filter_complex"));
        assert!(!args
            .iter()
            .any(|arg| arg.starts_with("album=") || arg.starts_with("genre=")));
        assert!(has_pair(
            &args,
            "-metadata",
            "comment=Tracklist:\nArtist - Track"
        ));
    }

    #[test]
    fn mp3_with_intro_keeps_the_overlay_and_cover_indices() {
        let args = build_ffmpeg_args(Path::new("work"), &job("mp3", true));
        assert!(has_pair(&args, "-map", "[a]"));
        assert!(has_pair(&args, "-map", "2"));
        assert!(has_pair(
            &args,
            "-filter_complex",
            "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]"
        ));
    }

    #[test]
    fn mp3_metadata_is_supplied_by_the_job() {
        let mut input = job("mp3", false);
        input.artist = Some("Artist".to_string());
        input.album = Some("Collection".to_string());
        input.genre = Some("Ambient".to_string());
        let args = build_ffmpeg_args(Path::new("work"), &input);
        for value in ["artist=Artist", "album=Collection", "genre=Ambient"] {
            assert!(has_pair(&args, "-metadata", value));
        }
    }

    #[test]
    fn video_without_intro_maps_the_original_audio() {
        let args = build_ffmpeg_args(Path::new("work"), &job("mp4", false));
        assert!(has_pair(&args, "-map", "0:v"));
        assert!(has_pair(&args, "-map", "1:a:0"));
        assert!(has_pair(&args, "-c:v", "libx264"));
        assert!(!args.iter().any(|arg| arg == "-filter_complex"));
    }

    #[test]
    fn video_with_intro_maps_the_mixed_audio() {
        let args = build_ffmpeg_args(Path::new("work"), &job("mp4", true));
        assert!(has_pair(&args, "-map", "[a]"));
        assert!(has_pair(
            &args,
            "-filter_complex",
            "[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=2[a]"
        ));
    }

    #[test]
    fn optional_paths_resolve_relative_to_the_job_file() {
        let parsed: JobFile = serde_json::from_str(r#"{"audioPath":"mix.mp3","imagePath":"cover.jpg","title":"Night Mix","description":"Artist - Track","outputFormat":"mp3","introPath":"branding/intro.wav"}"#).unwrap();
        let resolved = resolve_job_paths(parsed, Path::new("jobs/example.json"));
        assert_eq!(resolved.audio_path, PathBuf::from("jobs/mix.mp3"));
        assert_eq!(
            resolved.intro_path,
            Some(PathBuf::from("jobs/branding/intro.wav"))
        );
        assert_eq!(resolved.output_path, PathBuf::from("jobs/night_mix.mp3"));
    }

    #[test]
    fn existing_job_fields_do_not_require_branding() {
        let parsed: JobFile = serde_json::from_str(r#"{"audioPath":"mix.mp3","imagePath":"cover.jpg","title":"Mix","description":"Artist - Track","outputFormat":"mp4"}"#).unwrap();
        assert!(parsed.intro_path.is_none());
        assert!(parsed.genre.is_none());
        assert!(parsed.album.is_none());
    }
}
