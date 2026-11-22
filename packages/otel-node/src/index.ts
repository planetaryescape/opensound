import * as NodeSdk from "@effect/opentelemetry/NodeSdk";
import "@opentelemetry/sdk-trace-node";
import type * as Resource from "@effect/opentelemetry/Resource";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type * as Layer from "effect/Layer";

export interface NodeTelemetryOptions {
  readonly batch?: boolean;
  readonly serviceVersion?: string;
}

export const getOtlpTraceExporterUrl = (baseUrl?: string): string | undefined => {
  if (baseUrl === undefined || baseUrl.length === 0) {
    return undefined;
  }

  return baseUrl.endsWith("/v1/traces") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/v1/traces`;
};

export const makeNodeTelemetryLayer = (
  serviceName: string,
  options: NodeTelemetryOptions = {},
): Layer.Layer<Resource.Resource> => {
  const exporterUrl = getOtlpTraceExporterUrl(process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]);
  const exporter =
    exporterUrl === undefined
      ? new ConsoleSpanExporter()
      : new OTLPTraceExporter({ url: exporterUrl });

  const processor =
    options.batch === true ? new BatchSpanProcessor(exporter) : new SimpleSpanProcessor(exporter);

  return NodeSdk.layer(() => ({
    resource: {
      serviceName,
      serviceVersion: options.serviceVersion ?? "0.1.0",
    },
    spanProcessor: processor,
  }));
};
