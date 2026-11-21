# ACYA Élancé — Diagnostic réseau complémentaire (Phase 2) avant Rescue OVH

**Mode :** lecture seule. Aucun redémarrage, aucune modification de firewall, de route, de Docker, de Nginx ou d'application. Aucune requête d'authentification TEJ.
**Fenêtre d'exécution :** 2026-11-18 11:02Z – 11:09Z. **Hôte :** `vps-1d2bffb5`, VPS OVH Strasbourg.

Légende : **[FAIT]** observé directement · **[HYPOTHÈSE]** interprétation non prouvée · **[IMPOSSIBLE]** non vérifiable depuis le VPS.

---

## 1. Résumé

| Test | Résultat |
|---|---|
| TCP 443 vers `41.225.7.188` depuis l'hôte (×3) | **3 échecs** (timeout 5 s) |
| TCP 443 vers `41.225.7.188` depuis le conteneur API | **échec** (timeout 5 s) |
| TCP 443 vers `1.1.1.1` (contrôle) depuis l'hôte et le conteneur | **succès** |
| MTR vers `41.225.7.188` (50 paquets) | 0 % de perte jusqu'au saut 16 (AS2609, `196.203.189.70`, 36,6 ms). Le saut 17 et la destination ne répondent pas (100 %). |
| MTR vers `1.1.1.1` (contrôle) | 0 % de perte jusqu'à la destination (13 sauts) |
| Erreurs d'interface `ens3` | RX/TX errors = 0, dropped = 0 |
| Résolution DNS | `login-tej.finances.gov.tn` → `41.225.7.188` |

**Conclusion [FAIT] :** la configuration locale du VPS (interface, passerelle, route, DNS) est saine. Le trafic quitte le réseau OVH et atteint l'AS2609 (opérateur tunisien) sans perte. La connexion TCP 443 vers `41.225.7.188` n'aboutit pas, depuis l'hôte comme depuis le conteneur. Le point exact où le paquet est perdu n'est pas déterminable depuis le VPS.

---

## 2. Phase 1 — Identification réseau

Commandes : `date -Is; hostname; uname -a; ip -br link; ip -br addr; ip route; ip rule; ip route get 41.225.7.188` (2026-11-18T11:02:21+00:00).

| Élément | Valeur [FAIT] |
|---|---|
| Noyau | Linux 6.14.0-37-generic, x86_64 |
| Dernier démarrage de l'hôte | 2026-07-08 20:20:04 (aucun redémarrage depuis) |
| Interface principale | `ens3`, état UP |
| MAC `ens3` | `fa:16:3e:51:d2:08` |
| IPv4 | `51.210.10.108/32` (masque /32, attribuée par DHCP, métrique 100) |
| IPv6 | `2001:41d0:404:200::3e9a/128` (passerelle IPv6 `2001:41d0:404:200::1`) |
| Passerelle par défaut | `51.210.8.1` via `ens3`, `proto dhcp` |
| Route spécifique | `213.186.33.99 via 51.210.8.1` (DHCP) |
| Règles de routage | uniquement `local`, `main`, `default` (aucune règle personnalisée) |
| Route vers TEJ | `41.225.7.188 via 51.210.8.1 dev ens3 src 51.210.10.108` |
| Autres interfaces | `docker0` (DOWN), 4 ponts Docker (`br-667ea0710721`=172.18.0.1/16, `br-3f53c95f0e4d`, `br-71b7e4167b1c`, `br-56f3c088190f`), 11 interfaces `veth` |

Remarque [FAIT] : l'adresse IPv4 publique est portée directement par l'interface en /32, avec la passerelle atteinte par une route on-link. C'est le schéma habituel d'OVH.

---

## 3. Phase 2 — État de l'interface `ens3`

Commandes : `ip -s link show dev ens3`, `ethtool ens3`, `ethtool -S ens3` (exécutées sans privilèges root).

**`ip -s link`**

| | bytes | packets | errors | dropped | missed / carrier | mcast / collsns |
|---|---|---|---|---|---|---|
| RX | 109 776 721 931 | 65 939 893 | **0** | **0** | missed 0 | mcast 0 |
| TX | 80 846 117 196 | 87 005 581 | **0** | **0** | carrier 0 | collsns 0 |

- MTU 1500, qdisc `fq_codel`, `state UP`, `qlen 1000`. [FAIT]

**`ethtool ens3`** [FAIT]
- `Link detected: yes`.
- Vitesse et duplex : `Unknown!` (le pilote virtio ne les expose pas). Ce n'est **pas** une panne de lien.
- `Supports auto-negotiation: No`, `Port: Other`, `Transceiver: internal`.
- Le message `netlink error: Operation not permitted` est apparu (commande lancée sans root). La sortie principale a malgré tout été fournie.

**`ethtool -S ens3`** (compteurs du pilote `virtio_net`) [FAIT]
- Présents, tous à 0 : `rx_drops`, `rx_xdp_drops`, `tx_tx_timeouts`, `rx0_drops`, `tx0_tx_timeouts`, `tx_xdp_tx_drops`.
- Présents, non nuls et sans signification d'erreur : `rx_kicks` 1374, `tx_kicks` 74 235 823.

**Compteurs absents (non interprétés comme 0) [IMPOSSIBLE] :** erreurs CRC, erreurs de porteuse physique, FIFO/frame errors. Le pilote virtio ne les expose pas, donc leur valeur est inconnue. Les champs `carrier` de `ip -s` valent 0, mais pour une interface virtuelle ils ne prouvent rien sur la couche physique de l'hyperviseur.

---

## 4. Phase 3 — DNS et TCP

**DNS** (`getent ahostsv4 login-tej.finances.gov.tn`) [FAIT] : `41.225.7.188`.

**TCP 443 vers `41.225.7.188`** (sans proxy, variables de proxy désactivées, `timeout 5 bash -c '</dev/tcp/…'`) :

| Heure (Z) | Résultat |
|---|---|
| 11:02:53 | `TCP_443_FAILED` (rc=124, timeout) |
| 11:03:00 | `TCP_443_FAILED` (rc=124) |
| 11:03:07 | `TCP_443_FAILED` (rc=124) |

**Contrôle `1.1.1.1:443`** à 11:03:14 : `CONTROL_TCP_SUCCESS`.

Observations [FAIT] : les trois échecs sont identiques, donc reproductibles. Le rc=124 signifie que `timeout` a tué la tentative au bout de 5 s : aucune réponse (ni SYN-ACK ni RST) n'est revenue avant l'échéance. Un refus actif (RST) aurait produit un échec immédiat avec un autre code.

---

## 5. Phase 4 — MTR détaillé

MTR est installé (`/usr/bin/mtr`). Aucune installation effectuée.
Commande : `mtr -o 'J M X LSR NA B W V' -wzbc 50 <destination>`. Résultats complets ci-dessous.

### 5.1 MTR vers `41.225.7.188` — début 2026-11-18 11:06:47Z, fin 11:07:49Z

```
HOST: vps-1d2bffb5                                          Jttr  Javg  Jmax  Loss%   Snt   Rcv   Last   Avg   Best   Wrst  StDev
  1. AS16276  _gateway (51.210.8.1)                          0.1   0.1   0.1   0.0%    50    50    0.2   0.2    0.1    0.3    0.0
  2. AS???    192.168.143.254                                0.1   0.1   0.2   0.0%    50    50    0.2   0.2    0.1    0.4    0.1
  3. AS???    10.231.64.190                                  0.2   0.1   0.3   0.0%    50    50    0.3   0.4    0.3    0.6    0.1
  4. AS???    10.225.223.112                                 0.0   0.1   0.3   0.0%    50    50    0.4   0.4    0.3    0.6    0.1
  5. AS???    10.69.64.28                                    0.1   0.1   0.4   0.0%    50    50    0.6   0.5    0.4    0.8    0.1
  6. AS???    10.73.9.122                                    0.1   0.1   0.3   0.0%    50    50    0.2   0.4    0.2    0.6    0.1
  7. AS???    10.73.248.72                                   0.1   5.2  108.   0.0%    50    50    0.8   3.4    0.5  109.4   15.4
  8. AS16276  be108.fra-fr5-sbb2-nc5.de.eu (57.128.121.52)   0.0   0.1   0.4   0.0%    50    50    3.3   3.3    3.2    3.6    0.1
  9. AS???    10.200.0.11                                    0.1   0.1   0.3   0.0%    50    50    3.0   3.1    2.9    3.3    0.1
 10. AS???    ???                                            0.0   0.0   0.0  100.0    50     0    0.0   0.0    0.0    0.0    0.0
 11. AS6762   195.22.197.205                                 0.0   0.1   0.2   0.0%    50    50   28.2  28.2   28.0   28.3    0.1
 12. AS???    ???                                            0.0   0.0   0.0  100.0    50     0    0.0   0.0    0.0    0.0    0.0
 13. AS2609   193.95.1.222                                   0.1   0.2   1.3   0.0%    50    50   37.4  37.5   37.2   38.7    0.2
 14. AS2609   193.95.0.151                                   0.1   0.2   0.8   0.0%    50    50   37.3  37.4   37.2   38.2    0.2
 15. AS2609   193.95.96.7                                    0.2   0.2   0.7   0.0%    50    50   36.7  37.0   36.7   37.5    0.2
 16. AS2609   196.203.189.70                                 0.1   0.1   0.8   0.0%    50    50   36.5  36.6   36.5   37.4    0.1
 17. AS???    ???                                            0.0   0.0   0.0  100.0    50     0    0.0   0.0    0.0    0.0    0.0
```

### 5.2 MTR contrôle vers `1.1.1.1` — début 11:07:49Z, fin 11:08:49Z

```
HOST: vps-1d2bffb5                                            Jttr  Javg  Jmax  Loss%   Snt   Rcv   Last   Avg   Best   Wrst  StDev
  1. AS16276  _gateway (51.210.8.1)                            0.0   0.1   0.2   0.0%    50    50    0.2   0.2    0.1    0.4    0.0
  2. AS???    192.168.143.254                                  0.0   0.1   0.2   0.0%    50    50    0.2   0.2    0.1    0.3    0.0
  3. AS???    10.231.64.190                                    0.1   0.1   1.0   0.0%    50    50    0.5   0.4    0.3    1.4    0.2
  4. AS???    10.225.223.112                                   0.1   0.1   0.9   0.0%    50    50    0.4   0.5    0.3    1.4    0.1
  5. AS???    10.69.64.28                                      0.1   0.1   0.3   0.0%    50    50    0.5   0.5    0.3    0.8    0.1
  6. AS???    10.73.9.106                                      0.1   0.1   0.2   0.0%    50    50    0.4   0.4    0.3    0.6    0.1
  7. AS???    10.95.48.10                                      0.3   5.6  133.   0.0%    50    50    0.7   3.5    0.5  133.7   18.8
  8. AS16276  be102.fra-fra15-sbb1-8k.de.eu (91.121.215.197)   0.0  21.3  511.   0.0%    50    50    5.3  16.0    4.1  518.6   72.5
  9. AS???    10.200.6.195                                     3.1  10.7  167.   0.0%    50    50    9.7  11.3    4.5  172.8   23.7
 10. AS???    ???                                              0.0   0.0   0.0  100.0    50     0    0.0   0.0    0.0    0.0    0.0
 11. AS13335  162.158.84.78                                    0.0   0.1   0.3   0.0%    50    50    3.4   3.4    3.3    3.6    0.1
 12. AS13335  162.158.84.15                                   36.5   3.3  36.5   0.0%    50    50   52.2   6.6    3.7   52.2    7.4
 13. AS13335  one.one.one.one (1.1.1.1)                        0.0   0.4   7.9   0.0%    50    50    3.7   3.9    3.6   11.5    1.1
```

### 5.3 Lecture du MTR

- **[FAIT]** Les sauts 1 à 9 sont dans le réseau OVH (passerelle `51.210.8.1`, puis réseau privé `10.x`, puis `be108.fra-fr5…` AS16276). Ils présentent 0 % de perte. Les trajets TEJ et contrôle sont identiques jusqu'au saut 6 (`10.73.9.x`), puis divergent.
- **[FAIT]** Le saut 11 est AS6762 (`195.22.197.205`, 28 ms), puis les sauts 13 à 16 sont dans l'AS2609 (`193.95.x`, `196.203.189.70`, ~37 ms), tous à 0 % de perte. Le trafic ICMP atteint donc un réseau tunisien.
- **[FAIT]** Les sauts 10 et 12 (et 17) n'émettent pas de réponse ICMP « TTL exceeded » (100 %). Un saut qui ne répond pas à MTR n'indique pas à lui seul une perte de transit : les routeurs filtrent souvent ces messages. Le contrôle montre le même phénomène au saut 10 sans conséquence.
- **[FAIT]** Le dernier saut (17) est muet et la destination `41.225.7.188` ne répond pas aux sondes ICMP. Aucune réponse de la destination n'est observée.
- **[FAIT]** Le saut 7 présente un pic isolé (max ~109 ms ; 133 ms sur le test de contrôle), sans perte. Le saut 8 du contrôle a un pic à 511 ms. Ce sont des variations internes à OVH, sans lien démontré avec l'incident.
- **[HYPOTHÈSE]** Les paquets sont perdus après `196.203.189.70`, sur le dernier segment tunisien ou à l'équipement de bord de `41.225.7.188`. Rien ne permet d'identifier lequel. Une destination qui filtre l'ICMP produirait le même affichage, donc le MTR seul ne prouve pas où se situe la perte du TCP 443.
- **[IMPOSSIBLE]** Savoir si le filtrage est fondé sur l'adresse source, sur le pays, sur le port, ou s'il s'agit d'une panne. Il faudrait des captures côté destination ou un test depuis une autre adresse OVH.

---

## 6. Phase 5 — Voisinage réseau

Commande : `ip neigh show` [FAIT]

| Voisin | MAC | État |
|---|---|---|
| **`51.210.8.1` (passerelle IPv4 utilisée)** | **`0a:bd:61:f6:7e:11`** | REACHABLE |
| `2001:41d0:404:200::1` (passerelle IPv6) | `0a:bd:61:f6:7e:11` | STALE (router) |
| `fe80::8bd:61ff:fef6:7e11` | `0a:bd:61:f6:7e:11` | STALE (router) |
| Voisins Docker `172.18.0.2` à `.7` | adresses locales du pont | REACHABLE ou STALE |

- La passerelle IPv4 et la passerelle IPv6 partagent la même adresse MAC (`0a:bd:61:f6:7e:11`). [FAIT]
- Le voisin de la passerelle est résolu : la liaison de niveau 2 vers OVH fonctionne. Les états STALE des autres entrées sont normaux (entrées non utilisées récemment).
- Aucune adresse MAC du serveur distant n'a été cherchée : la destination est hors du réseau local et elle est atteinte via la MAC de la passerelle.

---

## 7. Phase 6 — Comparaison hôte / conteneur

Conteneurs en cours d'exécution (`docker ps`) : `migration-ui` (Up 6 jours), `wood-app-api` (Up 6 jours, healthy), `admin-elance-front` et `admin-elance-back` (Up 10 jours), `n8n` (Up 6 jours), `postgres-n8n` et `8cdff3364501_wood-app-postgres` (Up 2 mois, healthy), `acya-restore-n8n-pg` et `acya-restore-test-pg` (Up 5 semaines). Aucune variable d'environnement n'a été affichée.

| Élément | `wood-app-api` [FAIT] |
|---|---|
| Réseau Docker | `acya-app_wood-app-network` (pont `br-667ea0710721`) |
| IP du conteneur | `172.18.0.3` |
| Passerelle Docker | `172.18.0.1` |
| Route par défaut (lue dans `/proc/net/route`) | `eth0`, passerelle `010012AC` (hex, little-endian = `172.18.0.1`) ; réseau local `172.18.0.0/16` |
| Outils présents | `bash`, `timeout`, `curl`, `getent` |
| Outils absents | `ip`, `ping`, `nc` |

Test TCP depuis le conteneur (11:04:28Z–11:04:33Z, `bash /dev/tcp`) :

| Destination | Résultat |
|---|---|
| `41.225.7.188:443` | **échec** (rc=124, timeout) |
| `1.1.1.1:443` | **succès** |

**Comparaison [FAIT] :** hôte et conteneur donnent exactement les mêmes résultats : TEJ en timeout, contrôle en succès. Le conteneur sort par la route par défaut Docker (NAT sur l'hôte) comme tout le trafic sortant, et sa configuration n'ajoute pas de différence. Le problème n'est donc pas propre à Docker.

---

## 8. Comparaison avec le diagnostic Windows du 17/11/2026

**Ce que je connais [FAIT] :** d'après votre message, l'authentification TEJ depuis Windows a réussi sans proxy. Je n'ai pas accès au détail de ce test (adresse source, heure, durée, outil), je ne peux donc pas comparer plus finement.

| | Windows (17/11) | VPS OVH (11–18/11) |
|---|---|---|
| Connexion TCP 443 vers TEJ | réussie (l'authentification a abouti) | **échec** (timeout) |
| Proxy | aucun | aucun |
| Adresse source | non fournie (probablement une adresse tunisienne ; les connexions SSH et les utilisateurs de la boîte de dialogue TEJ proviennent de `41.230.32.173`) | `51.210.10.108` |

**[HYPOTHÈSE]** : puisque la destination répond depuis une autre adresse source, le problème dépend de l'adresse source ou du chemin emprunté depuis OVH vers cette destination, et non de la disponibilité du service TEJ lui-même. Un serveur TEJ hors service aurait échoué aussi depuis Windows. Ce raisonnement reste à confirmer (voir §10).
**[IMPOSSIBLE]** : établir depuis le VPS si le blocage vise l'adresse `51.210.10.108`, la plage OVH ou le pays.

---

## 9. Anomalies et points d'attention

1. **TCP vers `41.225.7.188:443` : timeout reproductible** (3 sur 3 depuis l'hôte, 1 sur 1 depuis le conteneur), alors que le contrôle `1.1.1.1:443` réussit. [FAIT]
2. **La destination ne répond pas non plus à l'ICMP** et le chemin devient muet après `196.203.189.70` (AS2609). [FAIT]
3. Aucune anomalie locale détectée : pas d'erreur ni de perte sur `ens3`, route normale, règles de routage par défaut, DNS correct. [FAIT]
4. Pics de latence ponctuels dans l'infrastructure OVH (sauts 7 à 9), sans perte ni lien démontré avec l'incident. [FAIT]
5. Les compteurs CRC et de porteuse physique sont indisponibles avec le pilote virtio. [IMPOSSIBLE]
6. L'adresse IPv4 est attribuée par DHCP ; son historique n'est pas disponible sur le VPS. [IMPOSSIBLE]

---

## 10. Points impossibles à vérifier depuis le VPS

- À quel saut précis le paquet TCP est perdu, et si la perte vient d'un filtrage ou d'une panne.
- Si le filtrage dépend de l'adresse source, de la plage OVH, du pays ou du protocole.
- Si l'IP `51.210.10.108` a changé depuis le 2 octobre 2026.
- L'état de la liaison physique côté hyperviseur (CRC, porteuse).
- Si l'équipement de bord de TEJ voit arriver les paquets SYN du VPS (nécessite une capture côté TEJ ou côté opérateur).

**Tests complémentaires sans modification (suggestions, non exécutés) :** un test TCP 443 vers `41.225.7.188` depuis un autre hébergeur non OVH ; un test depuis votre poste Windows en relevant son adresse publique ; un `tcpdump` limité à ce flux (installation et privilèges à valider avant) pour vérifier que le SYN sort bien de `ens3` et si un SYN-ACK ou un RST revient.

---

## 11. Commandes exécutées

`date -Is; hostname; uname -a; uptime -s; ip -br link; ip -br addr; ip route; ip rule; ip route get 41.225.7.188; ip -s link show dev ens3; ethtool ens3; ethtool -S ens3; getent ahostsv4 login-tej.finances.gov.tn; bash /dev/tcp (×3 TEJ, ×1 contrôle) avec timeout 5; mtr … (×2); ip neigh show; docker ps --format …; docker inspect (format limité au réseau, IP, passerelle et MAC, sans variables d'environnement); docker exec wood-app-api cat /proc/net/route; docker exec … test TCP et recherche d'outils.`

---

## 12. Conformité

- Aucun redémarrage, aucun passage en Rescue.
- Aucune modification de firewall, de route, de Docker, de Nginx ou d'application ; aucun paquet installé ; aucun proxy ou tunnel créé.
- Aucune requête d'authentification TEJ. Les seules tentatives vers TEJ sont des connexions TCP brutes et des sondes ICMP (MTR).
- Aucune variable d'environnement ni aucun secret affiché.
- Des fichiers de sortie MTR temporaires ont été écrits dans le répertoire de travail de l'assistant (`…/brain/…/scratch/`), hors du dépôt et de la production.
