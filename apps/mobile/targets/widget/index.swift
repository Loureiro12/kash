import SwiftUI
import WidgetKit

/// Links do app (expo-router): o widget só abre telas; nenhum dado da pessoa aparece aqui.
enum KashLink {
  static let assistant = URL(string: "com.andreloureiro.kash://assistant")!
  static let expense = URL(string: "com.andreloureiro.kash://lancar?tipo=gasto")!
}

struct KashEntry: TimelineEntry {
  let date: Date
}

/// Conteúdo fixo (sem dados): uma entrada só, sem atualizações.
struct KashProvider: TimelineProvider {
  func placeholder(in context: Context) -> KashEntry { KashEntry(date: .now) }
  func getSnapshot(in context: Context, completion: @escaping (KashEntry) -> Void) { completion(KashEntry(date: .now)) }
  func getTimeline(in context: Context, completion: @escaping (Timeline<KashEntry>) -> Void) {
    completion(Timeline(entries: [KashEntry(date: .now)], policy: .never))
  }
}

struct KashWidgetView: View {
  @Environment(\.widgetFamily) private var family
  var entry: KashEntry

  var body: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "sparkles").font(.system(size: 22, weight: .semibold))
      }
      .widgetURL(KashLink.assistant)
      .accessibilityLabel("Perguntar ao assistente do Kash")
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Label("Kash", systemImage: "sparkles").font(.headline)
        Text("Pergunte ao assistente").font(.caption)
        Text("Vale a pena comprar?").font(.caption2).foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetURL(KashLink.assistant)
    case .systemMedium:
      medium
    default:
      small
    }
  }

  private var badge: some View {
    ZStack {
      Circle().fill(Color("kashAccent"))
      Image(systemName: "sparkles").font(.system(size: 17, weight: .bold)).foregroundStyle(Color("kashInk"))
    }
    .frame(width: 38, height: 38)
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 6) {
      badge
      Spacer(minLength: 0)
      Text("Pergunte ao Kash").font(.system(size: 16, weight: .bold)).foregroundStyle(Color("kashText"))
      Text("Vale a pena comprar? Onde economizo?").font(.system(size: 12)).foregroundStyle(Color("kashMuted")).lineLimit(2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .widgetURL(KashLink.assistant)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 6) {
        badge
        Spacer(minLength: 0)
        Text("Assistente Kash").font(.system(size: 16, weight: .bold)).foregroundStyle(Color("kashText"))
        Text("Pergunte sobre seus gastos ou lance uma compra escrevendo.").font(.system(size: 12)).foregroundStyle(Color("kashMuted")).lineLimit(3)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      VStack(spacing: 8) {
        Link(destination: KashLink.assistant) {
          action(title: "Perguntar", icon: "bubble.left.and.text.bubble.right", filled: true)
        }
        Link(destination: KashLink.expense) {
          action(title: "Lançar gasto", icon: "plus", filled: false)
        }
      }
      .frame(width: 132)
    }
  }

  private func action(title: String, icon: String, filled: Bool) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 13, weight: .semibold))
      Text(title).font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
    }
    .foregroundStyle(filled ? Color("kashInk") : Color("kashText"))
    .frame(maxWidth: .infinity, minHeight: 44)
    .background(RoundedRectangle(cornerRadius: 14).fill(filled ? Color("kashAccent") : Color("kashMuted").opacity(0.18)))
  }
}

struct KashAssistantWidget: Widget {
  let kind = "KashAssistantWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: KashProvider()) { entry in
      KashWidgetView(entry: entry)
        .containerBackground(Color("kashBackground"), for: .widget)
    }
    .configurationDisplayName("Assistente Kash")
    .description("Abra o assistente ou lance um gasto com um toque.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}

@main
struct KashWidgets: WidgetBundle {
  var body: some Widget {
    KashAssistantWidget()
  }
}
