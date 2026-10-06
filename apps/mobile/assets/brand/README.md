# Kash — ícone e splash

## icon/
- icon-1024.png — App Store (1024×1024, sem transparência, sem cantos arredondados)
- icon-dark-1024.png — variante escura (ícone alternativo iOS / modo escuro)
- icon-512-play.png — Google Play (512×512)
- icon-180-ios.png — iPhone @3x
- icon-192-android.png — launcher legado xxxhdpi
- icon-432-android-adaptive-fg.png + icon-432-android-adaptive-bg.png — adaptive icon (foreground centralizado na safe zone; background #C6F432)

## splash/
- splash-ios-1320x2868.png — frame final da splash (LaunchScreen estático ou referência da animação)
- splash-android-1080x2400.png — idem Android
- splash-logo-1024-transparent.png — logo isolado para splash nativa (Android 12 SplashScreen API / iOS LaunchScreen: logo centralizado + fundo #C6F432)

## Animação (implementar em código após a splash nativa)
Fundo #C6F432. Duração total ~2,8 s.
1. 0,10 s — ícone: scale .4→1.08→1, rotate −12°→2°→0, 700 ms, cubic-bezier(.34,1.56,.64,1)
2. 0,55 s — ponto: translate(60,−60) scale 0 → scale 1.25 → 1, 550 ms, mesma curva
3. 0,95 s — conjunto sobe 120 px, 900 ms, cubic-bezier(.2,.8,.2,1)
4. 1,00 s — wordmark "Kash" revela de baixo (translateY 110%→0, com clip), 550 ms
5. 1,35 s — tagline fade + 8 px, 500 ms
6. 0,50 s — barra de progresso (64×4) scaleX 0→1, 1,9 s, cubic-bezier(.4,0,.2,1)
7. 2,35 s — splash inteira: opacity 1→0, scale 1→1.06, 450 ms ease-in → onboarding
Referência viva: Kash.dc.html (botão ▶ Splash).

## Gerado no projeto
- icon-432-android-adaptive-mono.png — silhueta com alpha (ícone monocromático/temático do Android 13+), derivada do foreground.
- favicon.png — 64×64 a partir do icon-1024 (web).
