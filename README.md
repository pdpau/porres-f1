# 🏎️ Porres F1 — Recompte de Punts

Aplicació web en **Streamlit** per fer apostes i calcular punts entre participants durant un cap de setmana de Fórmula 1. Utilitza **FastF1** per obtenir els resultats reals de cada sessió.

---

## Participants

**Albert · David · Pau**

---

## Com funciona

1. Selecciona el **Grand Prix** al panell lateral.
2. Clica **Carregar dades del GP** per obtenir els resultats reals via FastF1.
3. Introdueix les **prediccions** de cada participant per a cada sessió disponible.
4. Clica **Calcular punts!** per veure la classificació i el detall de punts.

---

## Sistema de puntuació

### Qualifying i Sprint Qualifying (SS)

| Resultat                             | Punts |
| ------------------------------------ | ----- |
| Top 3 en ordre exacte                | 3 pts |
| Top 3 pilots correctes (sense ordre) | 1 pt  |

### Cursa

| Resultat                             | Punts  |
| ------------------------------------ | ------ |
| Top 5 en ordre exacte                | 10 pts |
| Top 3 en ordre exacte                | 5 pts  |
| Top 3 pilots correctes (sense ordre) | 1 pt   |
| Top 5 pilots correctes (sense ordre) | 1 pt   |

### Sprint

| Resultat                             | Punts |
| ------------------------------------ | ----- |
| Top 5 en ordre exacte                | 6 pts |
| Top 3 en ordre exacte                | 3 pts |
| Top 3 pilots correctes (sense ordre) | 1 pt  |
| Top 5 pilots correctes (sense ordre) | 1 pt  |

### Punt extra per sessió

A cada sessió es pot apostar per **un punt extra addicional** triant una de les tres opcions:

| Opció              | Descripció                                                                     |
| ------------------ | ------------------------------------------------------------------------------ |
| **Posició exacta** | Encertar la posició exacta d'un pilot fora del top 5                           |
| **SC / VSC / RF**  | Encertar el nombre exacte de Safety Cars, Virtual Safety Cars o Banderes Roges |
| **DNF**            | Encertar que un pilot concret abandona la sessió                               |

---

## Estructura del projecte

```
porres-f1/
├── main.py        # Interfície Streamlit (UI, prediccions, visualització)
├── scoring.py     # Lògica de puntuació i punt extra
├── data.py        # Càrrega de dades via FastF1 (resultats + race control)
├── config.py      # Configuració: any, participants, calendari 2026
└── README.md
```

---

## Instal·lació i execució

```bash
pip install streamlit fastf1 pandas
streamlit run main.py
```

> FastF1 guarda una caché local de les dades. La primera càrrega d'un GP pot trigar uns segons.

---

## Calendari 2026

| R   | Gran Premi        |
| --- | ----------------- |
| R01 | Australia         |
| R02 | China             |
| R03 | Japan             |
| R04 | Bahrain           |
| R05 | Saudi Arabia      |
| R06 | Miami             |
| R07 | Canada            |
| R08 | Monaco            |
| R09 | Spain (Barcelona) |
| R10 | Austria           |
| R11 | Great Britain     |
| R12 | Belgium           |
| R13 | Hungary           |
| R14 | Netherlands       |
| R15 | Italy             |
| R16 | Spain (Madrid)    |
| R17 | Azerbaijan        |
| R18 | Singapore         |
| R19 | United States     |
| R20 | Mexico            |
| R21 | Brazil            |
| R22 | Las Vegas         |
| R23 | Qatar             |
| R24 | Abu Dhabi         |
