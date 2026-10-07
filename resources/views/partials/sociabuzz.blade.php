{{--
    Tombol donasi SociaBuzz.

    Dipasang sebagai syarat tinjauan akun SociaBuzz: keberadaan tombol ini di
    halaman dipakai mereka sebagai bukti kepemilikan situs. Di-include dari
    templates/wrapper.blade.php (seluruh halaman panel + auth) dan
    layouts/admin.blade.php (area /admin).

    Snippet di bawah ditulis persis seperti yang diberikan SociaBuzz — jangan
    diubah bentuknya (tanpa defer/async, tanpa guard). Peninjau mereka
    kemungkinan mencocokkan string sbBoW.draw("ichanzx", ...) apa adanya.

    Argumen sbBoW.draw(username, label, posisi, warna_aksen, warna_teks).
    Label dikirim dalam base64url; "QmVyaSBEdWt1bmdhbg" = "Beri Dukungan".
    Script-nya membuat sendiri div#wrapperFloatingBtn (position: fixed) dan
    append ke document.body, jadi tidak perlu elemen placeholder di sini.

    Kalau storage.sociabuzz.com tidak bisa dijangkau (mis. CDN diblokir di
    jaringan pembaca), sbBoW jadi undefined dan satu ReferenceError muncul di
    console. Halaman tetap berfungsi normal — React sudah mount terpisah.

    Halaman error (401/403/404/419/429/500/503) tidak memuat ini: dirender
    Laravel dari view bawaan framework yang tidak punya titik injeksi.
--}}
<script type="text/javascript" src="https://storage.sociabuzz.com/storage/js/main/buttononwebsite/index.min.js"></script>
<script>sbBoW.draw("ichanzx","QmVyaSBEdWt1bmdhbg","position-bottom-right","#76CC11","#FFFFFF")</script>
