import * as Schema from "effect/Schema";

const ExternalURLSchema = Schema.Record(Schema.String, Schema.String);
const ExternalIDSchema = Schema.Record(Schema.String, Schema.String);

const FollowersSchema = Schema.Struct({
  href: Schema.NullOr(Schema.String),
  total: Schema.Number,
});

const ExplicitContentSchema = Schema.Struct({
  filter_enabled: Schema.Boolean,
  filter_locked: Schema.Boolean,
});

const SpotifyImageSchema = Schema.Struct({
  height: Schema.NullOr(Schema.Number),
  url: Schema.String,
  width: Schema.NullOr(Schema.Number),
});

const RestrictionsSchema = Schema.Struct({
  reason: Schema.String,
});

const SimplifiedArtistSchema = Schema.Struct({
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  name: Schema.String,
  type: Schema.Literal("artist"),
  uri: Schema.String,
});

const SimplifiedAlbumSchema = Schema.Struct({
  album_group: Schema.optionalKey(
    Schema.Union([
      Schema.Literal("album"),
      Schema.Literal("single"),
      Schema.Literal("compilation"),
      Schema.Literal("appears_on"),
    ]),
  ),
  album_type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("ALBUM"),
    Schema.Literal("single"),
    Schema.Literal("SINGLE"),
    Schema.Literal("compilation"),
    Schema.Literal("COMPILATION"),
  ]),
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  release_date: Schema.String,
  release_date_precision: Schema.Union([
    Schema.Literal("year"),
    Schema.Literal("month"),
    Schema.Literal("day"),
  ]),
  restrictions: Schema.optionalKey(RestrictionsSchema),
  total_tracks: Schema.Number,
  type: Schema.Literal("album"),
  uri: Schema.String,
});

const CopyrightSchema = Schema.Struct({
  text: Schema.String,
  type: Schema.Union([Schema.Literal("C"), Schema.Literal("P")]),
});

const SimplifiedTrackSchema = Schema.Struct({
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.mutable(Schema.Array(Schema.String)),
  disc_number: Schema.Number,
  duration_ms: Schema.Number,
  explicit: Schema.Boolean,
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  is_playable: Schema.optionalKey(Schema.Boolean),
  restrictions: Schema.optionalKey(RestrictionsSchema),
  name: Schema.String,
  preview_url: Schema.NullOr(Schema.String),
  track_number: Schema.Number,
  type: Schema.Literal("track"),
  uri: Schema.String,
  is_local: Schema.Boolean,
});

const makePagingSchema = <A>(itemSchema: Schema.Schema<A>) =>
  Schema.Struct({
    href: Schema.String,
    items: Schema.mutable(Schema.Array(itemSchema)),
    limit: Schema.Number,
    next: Schema.NullOr(Schema.String),
    offset: Schema.Number,
    previous: Schema.NullOr(Schema.String),
    total: Schema.Number,
  });

export const TrackSchema = Schema.Struct({
  album: SimplifiedAlbumSchema,
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  disc_number: Schema.Number,
  duration_ms: Schema.Number,
  episode: Schema.optionalKey(Schema.Boolean),
  explicit: Schema.Boolean,
  external_ids: ExternalIDSchema,
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  is_playable: Schema.optionalKey(Schema.Boolean),
  name: Schema.String,
  popularity: Schema.Number,
  preview_url: Schema.NullOr(Schema.String),
  track: Schema.optionalKey(Schema.Boolean),
  track_number: Schema.Number,
  type: Schema.Literal("track"),
  uri: Schema.String,
  is_local: Schema.Boolean,
});

export const PublicUserSchema = Schema.Struct({
  display_name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  external_urls: ExternalURLSchema,
  followers: Schema.optionalKey(FollowersSchema),
  href: Schema.String,
  id: Schema.String,
  images: Schema.optionalKey(Schema.mutable(Schema.Array(SpotifyImageSchema))),
  type: Schema.Literal("user"),
  uri: Schema.String,
});

export const PrivateUserSchema = Schema.Struct({
  account_id: Schema.optionalKey(Schema.String),
  birthdate: Schema.optionalKey(Schema.String),
  country: Schema.optionalKey(Schema.String),
  display_name: Schema.NullOr(Schema.String),
  email: Schema.optionalKey(Schema.String),
  explicit_content: Schema.optionalKey(ExplicitContentSchema),
  external_urls: ExternalURLSchema,
  followers: Schema.optionalKey(FollowersSchema),
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  product: Schema.optionalKey(Schema.String),
  type: Schema.Literal("user"),
  uri: Schema.String,
});

export const AlbumSchema = Schema.Struct({
  album_type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("single"),
    Schema.Literal("compilation"),
  ]),
  artists: Schema.mutable(Schema.Array(SimplifiedArtistSchema)),
  available_markets: Schema.mutable(Schema.Array(Schema.String)),
  copyrights: Schema.mutable(Schema.Array(CopyrightSchema)),
  external_ids: ExternalIDSchema,
  external_urls: ExternalURLSchema,
  genres: Schema.mutable(Schema.Array(Schema.String)),
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  label: Schema.String,
  name: Schema.String,
  popularity: Schema.Number,
  release_date: Schema.String,
  release_date_precision: Schema.Union([
    Schema.Literal("year"),
    Schema.Literal("month"),
    Schema.Literal("day"),
  ]),
  restrictions: Schema.optionalKey(RestrictionsSchema),
  total_tracks: Schema.Number,
  tracks: makePagingSchema(SimplifiedTrackSchema),
  type: Schema.Literal("album"),
  uri: Schema.String,
});

export const ArtistSchema = Schema.Struct({
  external_urls: ExternalURLSchema,
  followers: FollowersSchema,
  genres: Schema.mutable(Schema.Array(Schema.String)),
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  popularity: Schema.Number,
  type: Schema.Literal("artist"),
  uri: Schema.String,
});

export const CategorySchema = Schema.Struct({
  href: Schema.String,
  icons: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  id: Schema.String,
  name: Schema.String,
});

const TracksRefSchema = Schema.Struct({
  href: Schema.String,
  total: Schema.Number,
});

export const SimplifiedPlaylistSchema = Schema.Struct({
  collaborative: Schema.optionalKey(Schema.Boolean),
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  owner: PublicUserSchema,
  primary_color: Schema.optionalKey(Schema.NullOr(Schema.String)),
  public: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
  snapshot_id: Schema.optionalKey(Schema.String),
  tracks: TracksRefSchema,
  type: Schema.Literal("playlist"),
  uri: Schema.String,
});

export const PlaylistItemSchema = Schema.Struct({
  added_at: Schema.NullOr(Schema.String),
  added_by: Schema.NullOr(PublicUserSchema),
  is_local: Schema.Boolean,
  primary_color: Schema.optionalKey(Schema.NullOr(Schema.String)),
  track: Schema.Union([TrackSchema, Schema.Record(Schema.String, Schema.Unknown)]),
  video_thumbnail: Schema.optionalKey(Schema.Struct({ url: Schema.NullOr(Schema.String) })),
});

export const PlaylistSchema = Schema.Struct({
  collaborative: Schema.Boolean,
  description: Schema.NullOr(Schema.String),
  external_urls: ExternalURLSchema,
  followers: FollowersSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  name: Schema.String,
  owner: PublicUserSchema,
  primary_color: Schema.optionalKey(Schema.NullOr(Schema.String)),
  public: Schema.NullOr(Schema.Boolean),
  snapshot_id: Schema.String,
  tracks: makePagingSchema(PlaylistItemSchema),
  type: Schema.Literal("playlist"),
  uri: Schema.String,
});

export const SnapshotIdResponseSchema = Schema.Struct({
  snapshot_id: Schema.String,
});

const ResumePointSchema = Schema.Struct({
  fully_played: Schema.Boolean,
  resume_position_ms: Schema.Number,
});

const SimplifiedShowSchema = Schema.Struct({
  available_markets: Schema.mutable(Schema.Array(Schema.String)),
  copyrights: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        text: Schema.String,
        type: Schema.Union([Schema.Literal("C"), Schema.Literal("P")]),
      }),
    ),
  ),
  description: Schema.String,
  explicit: Schema.Boolean,
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  is_externally_hosted: Schema.NullOr(Schema.Boolean),
  languages: Schema.mutable(Schema.Array(Schema.String)),
  media_type: Schema.String,
  name: Schema.String,
  publisher: Schema.String,
  type: Schema.Literal("show"),
  uri: Schema.String,
});

const EpisodeSchema = Schema.Struct({
  audio_preview_url: Schema.NullOr(Schema.String),
  description: Schema.String,
  duration_ms: Schema.Number,
  explicit: Schema.Boolean,
  external_urls: ExternalURLSchema,
  href: Schema.String,
  id: Schema.String,
  images: Schema.mutable(Schema.Array(SpotifyImageSchema)),
  is_externally_hosted: Schema.Boolean,
  is_playable: Schema.Boolean,
  language: Schema.optionalKey(Schema.String),
  languages: Schema.mutable(Schema.Array(Schema.String)),
  name: Schema.String,
  release_date: Schema.String,
  release_date_precision: Schema.Union([
    Schema.Literal("year"),
    Schema.Literal("month"),
    Schema.Literal("day"),
  ]),
  resume_point: Schema.optionalKey(ResumePointSchema),
  show: SimplifiedShowSchema,
  type: Schema.Literal("episode"),
  uri: Schema.String,
});

const ActionSchema = Schema.Union([
  Schema.Literal("interrupting_playback"),
  Schema.Literal("pausing"),
  Schema.Literal("resuming"),
  Schema.Literal("seeking"),
  Schema.Literal("skipping_next"),
  Schema.Literal("skipping_prev"),
  Schema.Literal("toggling_repeat_context"),
  Schema.Literal("toggling_shuffle"),
  Schema.Literal("toggling_repeat_track"),
  Schema.Literal("transferring_playback"),
]);

const DisallowsSchema = Schema.Struct({
  disallows: Schema.Record(ActionSchema, Schema.optionalKey(Schema.Boolean)),
});

const ContextSchema = Schema.Struct({
  uri: Schema.String,
  href: Schema.NullOr(Schema.String),
  external_urls: Schema.NullOr(ExternalURLSchema),
  type: Schema.Union([
    Schema.Literal("album"),
    Schema.Literal("artist"),
    Schema.Literal("playlist"),
  ]),
});

const DeviceTypeSchema = Schema.Union([
  Schema.Literal("Computer"),
  Schema.Literal("Tablet"),
  Schema.Literal("Smartphone"),
  Schema.Literal("Speaker"),
  Schema.Literal("TV"),
  Schema.Literal("AVR"),
  Schema.Literal("STB"),
  Schema.Literal("AudioDongle"),
  Schema.Literal("GameConsole"),
  Schema.Literal("CastVideo"),
  Schema.Literal("CastAudio"),
  Schema.Literal("Automobile"),
  Schema.Literal("Unknown"),
]);

export const DeviceSchema = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  is_active: Schema.Boolean,
  is_private_session: Schema.Boolean,
  is_restricted: Schema.Boolean,
  name: Schema.String,
  type: DeviceTypeSchema,
  volume_percent: Schema.NullOr(Schema.Number),
});

const TrackOrEpisodeSchema = Schema.Union([TrackSchema, EpisodeSchema]);

export const CurrentlyPlayingSchema = Schema.Struct({
  context: Schema.NullOr(ContextSchema),
  timestamp: Schema.Number,
  progress_ms: Schema.NullOr(Schema.Number),
  is_playing: Schema.Boolean,
  item: Schema.NullOr(TrackOrEpisodeSchema),
  currently_playing_type: Schema.Union([
    Schema.Literal("track"),
    Schema.Literal("episode"),
    Schema.Literal("ad"),
    Schema.Literal("unknown"),
  ]),
  actions: DisallowsSchema,
});

export const CurrentlyPlayingContextSchema = Schema.Struct({
  device: DeviceSchema,
  repeat_state: Schema.Union([
    Schema.Literal("off"),
    Schema.Literal("track"),
    Schema.Literal("context"),
  ]),
  shuffle_state: Schema.Boolean,
  context: Schema.NullOr(ContextSchema),
  timestamp: Schema.Number,
  progress_ms: Schema.NullOr(Schema.Number),
  is_playing: Schema.Boolean,
  item: Schema.NullOr(TrackSchema),
  currently_playing_type: Schema.Union([
    Schema.Literal("track"),
    Schema.Literal("episode"),
    Schema.Literal("ad"),
    Schema.Literal("unknown"),
  ]),
  actions: DisallowsSchema,
});

export const PlayHistorySchema = Schema.Struct({
  track: TrackSchema,
  played_at: Schema.String,
  context: Schema.NullOr(ContextSchema),
});

const CursorSchema = Schema.Struct({
  after: Schema.optionalKey(Schema.NullOr(Schema.String)),
  before: Schema.optionalKey(Schema.String),
});

export const makeCursorBasedPagingSchema = <A>(itemSchema: Schema.Schema<A>) =>
  Schema.Struct({
    href: Schema.String,
    items: Schema.mutable(Schema.Array(itemSchema)),
    limit: Schema.Number,
    next: Schema.NullOr(Schema.String),
    cursors: CursorSchema,
    total: Schema.optionalKey(Schema.Number),
  });

export const QueueObjectSchema = Schema.Struct({
  currently_playing: Schema.NullOr(TrackOrEpisodeSchema),
  queue: Schema.mutable(Schema.Array(TrackOrEpisodeSchema)),
});

export const AudioFeaturesSchema = Schema.Struct({
  duration_ms: Schema.Number,
  key: Schema.Number,
  mode: Schema.Number,
  time_signature: Schema.Number,
  acousticness: Schema.Number,
  danceability: Schema.Number,
  energy: Schema.Number,
  instrumentalness: Schema.Number,
  liveness: Schema.Number,
  loudness: Schema.Number,
  speechiness: Schema.Number,
  valence: Schema.Number,
  tempo: Schema.Number,
  id: Schema.String,
  uri: Schema.String,
  track_href: Schema.String,
  analysis_url: Schema.String,
  type: Schema.Literal("audio_features"),
});

const TimeIntervalSchema = Schema.Struct({
  start: Schema.Number,
  duration: Schema.Number,
  confidence: Schema.Number,
});

const SectionSchema = Schema.Struct({
  start: Schema.Number,
  duration: Schema.Number,
  confidence: Schema.Number,
  loudness: Schema.Number,
  tempo: Schema.Number,
  tempo_confidence: Schema.Number,
  key: Schema.Number,
  key_confidence: Schema.Number,
  mode: Schema.Number,
  mode_confidence: Schema.Number,
  time_signature: Schema.Number,
  time_signature_confidence: Schema.Number,
});

const SegmentSchema = Schema.Struct({
  start: Schema.Number,
  duration: Schema.Number,
  confidence: Schema.Number,
  loudness_start: Schema.Number,
  loudness_max: Schema.Number,
  loudness_max_time: Schema.Number,
  loudness_end: Schema.Number,
  pitches: Schema.mutable(Schema.Array(Schema.Number)),
  timbre: Schema.mutable(Schema.Array(Schema.Number)),
});

export const AudioAnalysisSchema = Schema.Struct({
  bars: Schema.mutable(Schema.Array(TimeIntervalSchema)),
  beats: Schema.mutable(Schema.Array(TimeIntervalSchema)),
  meta: Schema.optionalKey(Schema.Unknown),
  sections: Schema.mutable(Schema.Array(SectionSchema)),
  segments: Schema.mutable(Schema.Array(SegmentSchema)),
  tatums: Schema.mutable(Schema.Array(TimeIntervalSchema)),
  track: Schema.optionalKey(Schema.Unknown),
});

export const SavedAlbumSchema = Schema.Struct({
  added_at: Schema.String,
  album: AlbumSchema,
});

export const SavedTrackSchema = Schema.Struct({
  added_at: Schema.String,
  track: TrackSchema,
});

const BooleanArraySchema = Schema.mutable(Schema.Array(Schema.Boolean));
export { BooleanArraySchema };

export { makePagingSchema };
export { SimplifiedAlbumSchema };
