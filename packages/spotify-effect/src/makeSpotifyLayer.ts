import * as Layer from "effect/Layer";
import { FetchHttpClient } from "effect/http";
import { layer as albumsLayer } from "./api/Albums";
import { layer as artistsLayer } from "./api/Artists";
import { layer as browseLayer } from "./api/Browse";
import { layer as followLayer } from "./api/Follow";
import { layer as libraryLayer } from "./api/Library";
import { layer as marketsLayer } from "./api/Markets";
import { layer as personalizationLayer } from "./api/Personalization";
import { layer as playerLayer } from "./api/Player";
import { layer as playlistsLayer } from "./api/Playlists";
import { layer as searchLayer } from "./api/Search";
import { layer as tracksLayer } from "./api/Tracks";
import { layer as usersLayer } from "./api/Users";
import {
  makeSpotifyConfigLayer,
  makeSpotifySessionConfigLayer,
  type SpotifyCredentials,
  type SpotifyLayerOptions,
} from "./services/SpotifyConfig";
import { SpotifyAuth } from "./services/SpotifyAuth";
import { SpotifyRequest } from "./services/SpotifyRequest";
import { SpotifySession } from "./services/SpotifySession";

export const makeSpotifyLayer = (
  options: SpotifyLayerOptions = {},
  credentials: SpotifyCredentials = {},
) => {
  const baseLayer = Layer.mergeAll(
    options.httpClientLayer ?? FetchHttpClient.layer,
    makeSpotifyConfigLayer(options),
    makeSpotifySessionConfigLayer(credentials),
  );
  const authLayer = SpotifyAuth.layer.pipe(Layer.provideMerge(baseLayer));
  const sessionLayer = SpotifySession.layer.pipe(Layer.provideMerge(baseLayer));
  const requestDependencies = Layer.mergeAll(baseLayer, authLayer, sessionLayer);
  const requestLayer = SpotifyRequest.layer.pipe(Layer.provideMerge(requestDependencies));
  const domainDependencies = Layer.mergeAll(requestDependencies, requestLayer);
  const domainLayers = Layer.mergeAll(
    albumsLayer,
    artistsLayer,
    browseLayer,
    followLayer,
    libraryLayer,
    marketsLayer,
    personalizationLayer,
    playerLayer,
    playlistsLayer,
    searchLayer,
    tracksLayer,
    usersLayer,
  ).pipe(Layer.provideMerge(domainDependencies));

  return Layer.mergeAll(baseLayer, authLayer, sessionLayer, requestLayer, domainLayers);
};
