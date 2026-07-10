# SWS Document Portal

## System Architecture

```mermaid
flowchart TD

A[Google Sheet<br>Admin Only Edit Permission<br><br>Documents<br>Campaign<br>Latest Updates<br>Quick Access<br>Ticker]
--> B[Google Apps Script API<br>Read Only Data Bridge]


B --> C[Public Web Server<br>portal.sws.com.my]

C --> D[index.html<br>Main Homepage]

D --> E[worksite.html<br>Worksite Portal<br>Public Access]

D --> F[HQ Portal Button]


E --> G[Google Drive Documents<br>Applicable To Worksite = Yes]


F --> H[Company Intranet Server<br>hq.sws.com.my]


H --> I[Production Folder<br>sws-hq.html<br>HQ Users]

H --> J[Development Folder<br>sws-hq.html<br>Testing]


I --> K[Company Server Documents<br>\\\\SERVER\\Documents]


style A fill:#7ed957
style B fill:#ff914d
style C fill:#5ce1e6
style H fill:#5271ff
style I fill:#ffd966
style J fill:#ffd966
```

## Access Control

| Portal | Access | Storage |
|---|---|---|
| Homepage | Public | Public Server |
| Worksite Portal | Public | Google Drive Documents |
| HQ Portal | Internal Only | Company Server |
