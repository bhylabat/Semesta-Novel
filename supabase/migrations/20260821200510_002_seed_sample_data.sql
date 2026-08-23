/*
# Semesta Novel — Seed Sample Data

## Overview
Populates the database with sample genres, novels, and chapters so the UI looks alive on first load.

## Data Inserted
- 12 genres (Action, Fantasy, Romance, Reinkarnasi, Martial Arts, Sci-Fi, Horror, Komedi, Slice of Life, Mystery, Drama, Adventure)
- 15 novels with varied genres, statuses, ratings, and view counts
- ~7 chapters per novel (100+ total) with sample Indonesian content

## Notes
1. Uses ON CONFLICT DO NOTHING so re-running is safe
2. Cover URLs use gradient placeholders (CSS-based, no external dependency)
3. Chapter content is sample Indonesian novel text
*/

-- Genres
INSERT INTO genres (name, slug, icon) VALUES
  ('Action', 'action', 'Sword'),
  ('Fantasy', 'fantasy', 'Sparkles'),
  ('Romance', 'romance', 'Heart'),
  ('Reinkarnasi', 'reinkarnasi', 'RefreshCw'),
  ('Martial Arts', 'martial-arts', 'Fist'),
  ('Sci-Fi', 'sci-fi', 'Rocket'),
  ('Horror', 'horror', 'Ghost'),
  ('Komedi', 'komedi', 'Laugh'),
  ('Slice of Life', 'slice-of-life', 'Coffee'),
  ('Mystery', 'mystery', 'Search'),
  ('Drama', 'drama', 'Drama'),
  ('Adventure', 'adventure', 'Compass')
ON CONFLICT (slug) DO NOTHING;

-- Novels
INSERT INTO novels (title, slug, author, description, cover_url, banner_url, status, rating, views, bookmark_count, created_at) VALUES
  ('Reinkarnasi Sang Pangeran Iblis', 'reinkarnasi-sang-pangeran-iblis', 'DarkLordAuthor', 'Seorang pangeran iblis yang dihabisi dalam pertempuran besar terlahir kembali di tubuh manusia lemah. Dengan ingatan masa lalu dan kekuatan yang perlahan kembali, ia harus menapaki kembali tangga kekuasaan sambil menghadapi musuh yang dulu membunuhnya.', 'gradient-1', 'banner-1', 'ongoing', 9.8, 1250000, 8900, now() - interval '90 days'),
  ('Bintang yang Jatuh ke Bumi', 'bintang-yang-jatuh-ke-bumi', 'StellarWriter', 'Sebuah bintang jatuh ke bumi dan berubah menjadi seorang gadis misterius. Ia kehilangan ingatannya, namun memiliki kekuatan aneh yang bisa mengubah takdir dunia.', 'gradient-2', 'banner-2', 'ongoing', 9.5, 980000, 6700, now() - interval '75 days'),
  ('Pedang Sang Dewa Kemarau', 'pedang-sang-dewa-kemarau', 'BladeMaster', 'Di dunia di mana pedang adalah segalanya, seorang pemuda dari desa terpencil menemukan pedang legendaris yang dikatakan mampu membelah langit. Namun kekuatan besar datang dengan kutukan yang berat.', 'gradient-3', 'banner-3', 'ongoing', 9.6, 1100000, 7500, now() - interval '60 days'),
  ('Cinta di Balik Kabut Waktu', 'cinta-di-balik-kabut-waktu', 'RomanticSoul', 'Dua jiwa yang terpisahkan oleh waktu menemukan jalan kembali satu sama lain melalui keajaiban yang tak terduga. Sebuah kisah cinta yang melampaui batas kehidupan dan kematian.', 'gradient-4', 'banner-4', 'completed', 9.2, 750000, 5200, now() - interval '120 days'),
  ('Rahasia Kota Bawah Tanah', 'rahasia-kota-bawah-tanah', 'MysteryPen', 'Sebuah kota tersembunyi di bawah tanah menyimpan rahasia yang bisa mengubah sejarah umat manusia. Sekelompok penjelajah berani memasuki dunia gelap tersebut.', 'gradient-5', 'banner-5', 'ongoing', 8.9, 620000, 4100, now() - interval '45 days'),
  ('Akademi Magis Tersembunyi', 'akademi-magis-tersembunyi', 'MagicWriter', 'Di sebuah akademi magis yang tersembunyi dari mata dunia, siswa-siswa berbakat dilatih untuk menjadi penjaga keseimbangan antara dunia manusia dan dunia roh.', 'gradient-6', 'banner-6', 'ongoing', 9.1, 850000, 5800, now() - interval '50 days'),
  ('Sang Jenderal yang Mengkhianati Langit', 'sang-jenderal-yang-mengkhianati-langit', 'EpicTale', 'Seorang jenderal legendaris yang dulu melindungi langit kini berdiri di sisi kegelapan. Apa yang membuatnya berkhianat? Sebuah kisah epik tentang kehormatan, pengkhianatan, dan penebusan.', 'gradient-7', 'banner-7', 'ongoing', 9.7, 1350000, 9200, now() - interval '80 days'),
  ('Suara dari Menara Tua', 'suara-dari-menara-tua', 'GhostStory', 'Menara tua di pinggir desa menyimpan rahasia kelam. Setiap malam, suara aneh terdengar dari puncaknya. Seorang penulis muda datang untuk mengungkap kebenaran.', 'gradient-8', 'banner-8', 'hiatus', 8.5, 420000, 2800, now() - interval '100 days'),
  ('Dunia di Balik Cermin', 'dunia-di-balik-cermin', 'MirrorWorld', 'Sebuah cermin antik di rumah kuno ternyata adalah portal ke dunia paralel. Seorang gadis penasaran memasukinya dan menemukan dunia yang merupakan cerminan dari realitasnya.', 'gradient-9', 'banner-9', 'ongoing', 8.8, 580000, 3900, now() - interval '30 days'),
  ('Pemburu Bayangan', 'pemburu-bayangan', 'ShadowHunter', 'Di dunia di mana bayangan memiliki kehendak sendiri, seorang pemburu bayangan profesional harus menghentikan wabah bayangan yang mengancam menelan seluruh kota.', 'gradient-10', 'banner-10', 'ongoing', 9.3, 920000, 6300, now() - interval '20 days'),
  ('Hari-Hari Terakhir Musim Semi', 'hari-hari-terakhir-musim-panas', 'SliceOfLife', 'Kisah sederhana sekelompok teman SMA di hari-hari terakhir sebelum kelulusan. Tentang mimpi, persahabatan, cinta, dan perpisahan yang tak terhindarkan.', 'gradient-11', 'banner-11', 'completed', 9.0, 480000, 3400, now() - interval '150 days'),
  ('Eksperimen Nomor Tujuh', 'eksperimen-nomor-tujuh', 'SciFiGenius', 'Di masa depan, sebuah eksperimen rahasia menciptakan manusia super dengan kemampuan di luar nalar. Namun eksperimen nomor tujuh memiliki rahasia yang bisa menghancurkan segalanya.', 'gradient-12', 'banner-12', 'ongoing', 9.4, 780000, 5100, now() - interval '15 days'),
  ('Toko Antik Sang Kakek', 'toko-antik-sang-kakek', 'HeartWarming', 'Sebuah toko antik kecil di pinggir kota menyimpan benda-benda yang masing-masing memiliki kisahnya sendiri. Sang kakek pemilik toko adalah penjaga rahasia-rahasia tersebut.', 'gradient-13', 'banner-13', 'ongoing', 8.7, 380000, 2500, now() - interval '10 days'),
  ('Naga yang Menunggu Senja', 'naga-yang-menunggu-senja', 'DragonTale', 'Seekor naga kuno menunggu di puncak gunung tertinggi dunia. Ia menunggu seseorang yang berjanji akan kembali. Seribu tahun berlalu, dan seorang pemuda mendaki gunung tersebut.', 'gradient-14', 'banner-14', 'ongoing', 9.5, 1050000, 7100, now() - interval '5 days'),
  ('Detektif Cilik dan Kasus Kucing Hilang', 'detektif-cilik-dan-kasus-kucing-hilang', 'KidsMystery', 'Seorang anak berusia sepuluh tahun dengan otak detektif menyelesaikan kasus-kasus kecil di lingkungannya. Dimulai dari kucing tetangga yang hilang, ia menemukan petunjuk jaringan kejahatan yang lebih besar.', 'gradient-15', 'banner-15', 'ongoing', 8.6, 320000, 2100, now() - interval '3 days')
ON CONFLICT (slug) DO NOTHING;

-- Link novels to genres
INSERT INTO novel_genres (novel_id, genre_id)
SELECT n.id, g.id FROM novels n, genres g
WHERE (n.slug = 'reinkarnasi-sang-pangeran-iblis' AND g.slug IN ('action', 'fantasy', 'reinkarnasi'))
   OR (n.slug = 'bintang-yang-jatuh-ke-bumi' AND g.slug IN ('fantasy', 'sci-fi', 'drama'))
   OR (n.slug = 'pedang-sang-dewa-kemarau' AND g.slug IN ('action', 'fantasy', 'martial-arts'))
   OR (n.slug = 'cinta-di-balik-kabut-waktu' AND g.slug IN ('romance', 'drama'))
   OR (n.slug = 'rahasia-kota-bawah-tanah' AND g.slug IN ('mystery', 'adventure', 'horror'))
   OR (n.slug = 'akademi-magis-tersembunyi' AND g.slug IN ('fantasy', 'adventure', 'mystery'))
   OR (n.slug = 'sang-jenderal-yang-mengkhianati-langit' AND g.slug IN ('action', 'fantasy', 'drama'))
   OR (n.slug = 'suara-dari-menara-tua' AND g.slug IN ('horror', 'mystery'))
   OR (n.slug = 'dunia-di-balik-cermin' AND g.slug IN ('fantasy', 'mystery', 'adventure'))
   OR (n.slug = 'pemburu-bayangan' AND g.slug IN ('action', 'horror', 'fantasy'))
   OR (n.slug = 'hari-hari-terakhir-musim-panas' AND g.slug IN ('slice-of-life', 'romance', 'drama'))
   OR (n.slug = 'eksperimen-nomor-tujuh' AND g.slug IN ('sci-fi', 'mystery', 'action'))
   OR (n.slug = 'toko-antik-sang-kakek' AND g.slug IN ('slice-of-life', 'drama', 'mystery'))
   OR (n.slug = 'naga-yang-menunggu-senja' AND g.slug IN ('fantasy', 'adventure', 'drama'))
   OR (n.slug = 'detektif-cilik-dan-kasus-kucing-hilang' AND g.slug IN ('mystery', 'komedi', 'adventure'))
ON CONFLICT (novel_id, genre_id) DO NOTHING;

-- Chapters (7 per novel, 105 total)
-- Using a DO block to generate chapters for all novels
DO $$
DECLARE
  novel_record RECORD;
  chapter_titles TEXT[] := ARRAY[
    'Awal dari Segalanya', 'Pertemuan Tak Terduga', 'Rahasia yang Terungkap',
    'Pertempuran Pertama', 'Kekuatan Tersembunyi', 'Pengkhianatan',
    'Keputusan Sulit', 'Bayangan Masa Lalu', 'Jalan yang Dipilih',
    'Badai Akan Datang'
  ];
  chapter_content TEXT := 'Bab ini menceritakan bagian menarik dari petualangan. Karakter utama berhadapan dengan tantangan baru yang menguji batas kemampuannya. Setiap kata yang terucap membawa makna tersembunyi, dan setiap langkah yang diambil membawa konsekuensi yang tak terduga. Dunia di sekitarnya terus berubah, dan ia harus beradaptasi untuk bertahan hidup. Apa yang akan terjadi selanjutnya? Hanya waktu yang akan menjawabnya. Langit mulai gelap, angin berhembus kencang membawa aroma hujan dan debu. Ia berdiri di tepi jurang, menatap ke bawah, mencari keberanian yang dulu pernah ada. Jauh di sana, cahaya redup dari sebuah desa menjadi petunjuk harapan. Namun jalan menuju kesana dipenuhi dengan bahaya yang tak terlihat. Ia menghela napas, mengepalkan tinju, dan melangkah maju. Tidak ada jalan kembali sekarang. Cerita ini baru saja dimulai, dan bab-bab berikutnya akan membawa kita lebih dalam ke dalam dunia penuh misteri dan keajaiban.';
  i integer;
  created_offset integer;
BEGIN
  FOR novel_record IN SELECT id, slug FROM novels LOOP
    FOR i IN 1..7 LOOP
      created_offset := 90 - (i * 3);
      INSERT INTO chapters (novel_id, chapter_number, title, content, views, created_at)
      VALUES (
        novel_record.id,
        i,
        chapter_titles[((i - 1) % array_length(chapter_titles, 1)) + 1],
        chapter_content,
        (random() * 5000 + 500)::bigint,
        now() - (created_offset || ' days')::interval
      )
      ON CONFLICT (novel_id, chapter_number) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
