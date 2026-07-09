AthletePro
MVP scope – V1 (skupina WLB)
9. července 2026
Cíl V1
Zjednodušená první verze appky, zaměřená pouze na skupinu WLB (vzpírání pro začátečníky). Cílem je ověřit základní flow – zápis výsledků z tréninku – dřív, než se appka rozšíří o skupinu RSP (silovka) a další funkce.
Přístup a přihlášení
Žádná veřejná registrace – klienty i tréninky vytváří kouč sám v administraci.
Klient si při prvním otevření appky vybere svoje jméno ze seznamu (např. přes našeptávač) a zadá přidělený kód.
Appka si přihlášení zapamatuje (token/local storage) – při dalších návštěvách se už neptá.
Klientská appka
Zobrazení tréninku
Klient vidí „dnešní“ trénink podle data, přiřazeného v adminu přes kalendář.
Trénink se skládá z více cviků, každý cvik může mít vlastní typ výsledku.
Typy výsledků
Typ výsledku definuje kouč při tvorbě tréninku, u každého cviku zvlášť. Návrh vychází z toho, jak výsledky řeší Hevy, SugarWOD a TrueCoach:


Ke každému výsledku lze volitelně přidat RPE (bez ohledu na typ).
Ke každému výsledku lze volitelně přidat textovou poznámku.
Výsledek se po zadání uloží do databáze.
Administrace
Klienti
Kouč vytváří klienty ručně (jméno, kód pro přihlášení).
Přehled výsledků per klient – kouč vidí všechny zaznamenané výsledky konkrétního klienta napříč tréninky.
Tvorba tréninků
Textové pole pro popis/obsah tréninku + seznam cviků.
U každého cviku výběr typu výsledku (viz tabulka výše).
Tlačítko pro update – editace existujícího tréninku.
Kalendář
Přiřazení tréninku ke konkrétnímu dni (klient pak v appce vidí „dnešní“ trénink automaticky).
Zpětné procházení historie odučených tréninků.
Mimo scope V1
Vědomě odloženo na pozdější verzi:
Skupina RSP (silovka) a oddělení tréninků podle skupin – V1 pokrývá pouze WLB.
Samostatné zapisování osobních maxim klientem nezávisle na tréninku.
RE-test / porovnání progresu v čase – nápad zůstává, ale mechanismus ještě není rozhodnutý: buď automatické párování podle názvu cviku (kdykoli se stejný cvik objeví znovu, appka ukáže rozdíl oproti minule), nebo explicitní „test“ lekce, která se záměrně opakuje a porovnává jako celek.