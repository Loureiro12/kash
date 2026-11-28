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

// MARK: - Gastos do Kash (com números)

/// Números gravados pelo app no App Group (src/features/widgets/useWidgetSync.ts), já formatados.
struct KashSummary {
  let day: String
  let today: String
  let left: String
  let leftLabel: String
  let pct: Int
  let over: Bool
  let hidden: Bool

  static let appGroup = "group.com.andreloureiro.kash"

  static func load() -> KashSummary? {
    guard let d = UserDefaults(suiteName: appGroup)?.dictionary(forKey: "summary") else { return nil }
    func str(_ k: String) -> String { d[k] as? String ?? "" }
    func int(_ k: String) -> Int { (d[k] as? Int) ?? Int(d[k] as? Double ?? 0) }
    return KashSummary(day: str("day"), today: str("today"), left: str("left"), leftLabel: str("leftLabel"), pct: int("pct"), over: int("over") == 1, hidden: int("hidden") == 1)
  }

  /// os números são de outro dia (o app ainda não abriu hoje)
  func isStale(at date: Date) -> Bool {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date) != day
  }

  static let sample = KashSummary(day: "", today: "R$ 45,90", left: "R$ 1.230,00", leftLabel: "Sobram no mês", pct: 58, over: false, hidden: false)
}

struct SummaryEntry: TimelineEntry {
  let date: Date
  let summary: KashSummary?
}

/// Atualiza quando o app grava (reloadTimelines) e à meia-noite (o "hoje" vira velho).
struct SummaryProvider: TimelineProvider {
  func placeholder(in context: Context) -> SummaryEntry { SummaryEntry(date: .now, summary: .sample) }
  func getSnapshot(in context: Context, completion: @escaping (SummaryEntry) -> Void) {
    completion(SummaryEntry(date: .now, summary: context.isPreview ? .sample : KashSummary.load()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<SummaryEntry>) -> Void) {
    let summary = KashSummary.load()
    let midnight = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
    let entries = [SummaryEntry(date: .now, summary: summary), SummaryEntry(date: midnight, summary: summary)]
    completion(Timeline(entries: entries, policy: .after(midnight.addingTimeInterval(60))))
  }
}

struct KashSummaryView: View {
  @Environment(\.widgetFamily) private var family
  var entry: SummaryEntry

  var body: some View {
    if let s = entry.summary {
      let stale = s.isStale(at: entry.date)
      switch family {
      case .accessoryRectangular:
        VStack(alignment: .leading, spacing: 1) {
          Text("Kash · hoje").font(.caption2).foregroundStyle(.secondary)
          Text(stale ? "—" : s.today).font(.headline).privacySensitive()
          Text("\(s.leftLabel): \(s.left)").font(.caption2).privacySensitive()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(KashLink.expense)
      case .systemMedium:
        HStack(spacing: 14) {
          numbers(s, stale: stale)
          VStack(spacing: 8) {
            Link(destination: KashLink.expense) { pill("Lançar gasto", icon: "plus", filled: true) }
            Link(destination: KashLink.assistant) { pill("Perguntar", icon: "sparkles", filled: false) }
          }
          .frame(width: 128)
        }
      default:
        numbers(s, stale: stale).widgetURL(KashLink.expense)
      }
    } else {
      VStack(alignment: .leading, spacing: 4) {
        Text("Kash").font(.system(size: 16, weight: .bold)).foregroundStyle(Color("kashAccent"))
        Text("Entre no app para ver seus gastos aqui.").font(.system(size: 12)).foregroundStyle(Color("kashMuted"))
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
  }

  private func numbers(_ s: KashSummary, stale: Bool) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text("Kash").font(.system(size: 13, weight: .bold)).foregroundStyle(Color("kashAccent"))
        Spacer()
        Text(stale ? "abra o app" : "hoje").font(.system(size: 11)).foregroundStyle(Color("kashMuted"))
      }
      Spacer(minLength: 0)
      Text(stale ? "—" : s.today)
        .font(.system(size: 24, weight: .heavy)).foregroundStyle(Color("kashText"))
        .minimumScaleFactor(0.6).lineLimit(1).privacySensitive()
      Text("\(s.leftLabel): \(s.left)")
        .font(.system(size: 11)).foregroundStyle(s.over ? Color.red : Color("kashMuted"))
        .lineLimit(2).privacySensitive()
      if s.pct > 0 {
        GeometryReader { g in
          ZStack(alignment: .leading) {
            Capsule().fill(Color("kashMuted").opacity(0.25))
            Capsule().fill(s.over ? Color.red : Color("kashAccent")).frame(width: max(6, g.size.width * CGFloat(min(100, s.pct)) / 100))
          }
        }
        .frame(height: 6)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }

  private func pill(_ title: String, icon: String, filled: Bool) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 13, weight: .semibold))
      Text(title).font(.system(size: 13, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.8)
    }
    .foregroundStyle(filled ? Color("kashInk") : Color("kashText"))
    .frame(maxWidth: .infinity, minHeight: 44)
    .background(RoundedRectangle(cornerRadius: 14).fill(filled ? Color("kashAccent") : Color("kashMuted").opacity(0.18)))
  }
}

struct KashSummaryWidget: Widget {
  let kind = "KashSummaryWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SummaryProvider()) { entry in
      KashSummaryView(entry: entry)
        .containerBackground(Color("kashBackground"), for: .widget)
    }
    .configurationDisplayName("Gastos do Kash")
    .description("Quanto saiu hoje e quanto sobra no mês. Respeita “ocultar valores”.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

@main
struct KashWidgets: WidgetBundle {
  var body: some Widget {
    KashSummaryWidget()
    KashAssistantWidget()
  }
}
