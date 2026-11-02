import SwiftUI
import WidgetKit

private let accent = Color("LoteAccent")
private let accentSoft = Color("LoteAccentSoft")

struct ActionPill: View {
  let title: String
  let symbol: String
  let url: URL
  var prominent = false

  var body: some View {
    Link(destination: url) {
      HStack(spacing: 6) {
        Image(systemName: symbol).font(.system(size: 13, weight: .semibold))
        Text(title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
      }
      .frame(maxWidth: .infinity, minHeight: 34)
      .foregroundStyle(prominent ? Color.white : accent)
      .background(prominent ? accent : accentSoft, in: Capsule())
    }
  }
}

struct HomeSmallView: View {
  let entry: LoteEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: 6) {
        Image(systemName: "wand.and.rays").font(.system(size: 13, weight: .bold)).foregroundStyle(accent)
        Text("Lote").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
      }
      Spacer(minLength: 0)
      Text(entry.totalRenamed.grouped)
        .font(.system(size: 30, weight: .bold, design: .rounded))
        .monospacedDigit()
        .minimumScaleFactor(0.6)
        .lineLimit(1)
        .contentTransition(.numericText())
      Text("renomeados").font(.system(size: 12)).foregroundStyle(.secondary)
      Spacer(minLength: 0)
      ActionPill(title: "Fotos", symbol: "photo.on.rectangle", url: LoteLinks.photos, prominent: true)
    }
  }
}

struct HomeMediumView: View {
  let entry: LoteEntry
  var body: some View {
    HStack(spacing: 16) {
      VStack(alignment: .leading, spacing: 4) {
        HStack(spacing: 6) {
          Image(systemName: "wand.and.rays").font(.system(size: 13, weight: .bold)).foregroundStyle(accent)
          Text("Lote").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
        }
        Spacer(minLength: 0)
        Text(entry.totalRenamed.grouped)
          .font(.system(size: 34, weight: .bold, design: .rounded))
          .monospacedDigit()
          .minimumScaleFactor(0.6)
          .lineLimit(1)
        Text("arquivos renomeados").font(.system(size: 12)).foregroundStyle(.secondary)
        Spacer(minLength: 0)
        if !entry.lastLabel.isEmpty {
          Text("Último: \(entry.lastLabel) · \(entry.lastCount)")
            .font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
        } else {
          Text("Preset: \(entry.quickPresetName)").font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
        }
      }
      VStack(spacing: 8) {
        ActionPill(title: "Fotos", symbol: "photo.on.rectangle", url: LoteLinks.photos, prominent: true)
        ActionPill(title: "Arquivos", symbol: "folder", url: LoteLinks.files)
        ActionPill(title: "Câmera", symbol: "camera", url: LoteLinks.camera)
      }
      .frame(width: 132)
    }
  }
}

struct LoteHomeWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: LoteEntry
  var body: some View {
    Group {
      switch family {
      case .systemMedium: HomeMediumView(entry: entry)
      default: HomeSmallView(entry: entry)
      }
    }
    .containerBackground(for: .widget) { Color("LoteBackground") }
    .widgetURL(LoteLinks.photos)
  }
}

struct LoteHomeWidget: Widget {
  let kind = "LoteHomeWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LoteProvider()) { entry in
      LoteHomeWidgetView(entry: entry)
    }
    .configurationDisplayName("Lote")
    .description("Total renomeado e atalhos para renomear fotos, arquivos ou tirar uma foto já nomeada.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
