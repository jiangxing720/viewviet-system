const pg = require('/Users/zhangxing/Downloads/Smart-System-Optimize 2/node_modules/.pnpm/pg@8.20.0/node_modules/pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000
});

const words = [
  ["Thành phố","vi","thành phố","城市","City","Thành phố","城市区域",1,true,"Tôi sống ở một thành phố lớn.","我住在一个大城市。"],
  ["Thủ đô","vi","thủ đô","首都","Capital city","Thủ đô","城市区域",1,true,"Hà Nội là thủ đô của Việt Nam.","河内是越南首都。"],
  ["Hà Nội","vi","hà nội","河内","Hanoi","Hà Nội","城市区域",1,true,"Hà Nội có nhiều hồ đẹp.","河内有很多漂亮的湖。"],
  ["Thành phố Hồ Chí Minh","vi","thành phố hồ chí minh","胡志明市","Ho Chi Minh City","Thành phố Hồ Chí Minh","城市区域",2,true,"Thành phố Hồ Chí Minh rất nhộn nhịp.","胡志明市非常繁华。"],
  ["Đà Nẵng","vi","đà nẵng","岘港","Da Nang","Đà Nẵng","城市区域",1,true,"Đà Nẵng nổi tiếng với bãi biển đẹp.","岘港以美丽海滩闻名。"],
  ["Hải Phòng","vi","hải phòng","海防","Hai Phong","Hải Phòng","城市区域",2,true,"Hải Phòng là thành phố cảng lớn.","海防是大型港口城市。"],
  ["Cần Thơ","vi","cần thơ","芹苴","Can Tho","Cần Thơ","城市区域",2,true,"Cần Thơ nổi tiếng với chợ nổi.","芹苴以水上市场闻名。"],
  ["Huế","vi","huế","顺化","Hue","Huế","城市区域",1,true,"Huế từng là kinh đô cổ của Việt Nam.","顺化曾是越南古都。"],
  ["Nha Trang","vi","nha trang","芽庄","Nha Trang","Nha Trang","城市区域",2,true,"Nha Trang có nhiều khu nghỉ dưỡng đẹp.","芽庄有很多美丽度假区。"],
  ["Vũng Tàu","vi","vũng tàu","头顿","Vung Tau","Vũng Tàu","城市区域",2,true,"Vũng Tàu là thành phố biển nổi tiếng.","头顿是著名海滨城市。"],
  ["Đà Lạt","vi","đà lạt","大叻","Da Lat","Đà Lạt","城市区域",2,true,"Đà Lạt có khí hậu mát mẻ quanh năm.","大叻全年气候凉爽。"],
  ["Sa Pa","vi","sa pa","沙坝","Sa Pa","Sa Pa","城市区域",2,true,"Sa Pa nổi tiếng với ruộng bậc thang.","沙坝以梯田闻名。"],
  ["Quảng Ninh","vi","quảng ninh","广宁","Quang Ninh","Quảng Ninh","城市区域",2,true,"Quảng Ninh có Vịnh Hạ Long nổi tiếng.","广宁有著名的下龙湾。"],
  ["Vịnh Hạ Long","vi","vịnh hạ long","下龙湾","Ha Long Bay","Vịnh Hạ Long","城市区域",2,true,"Vịnh Hạ Long là di sản thế giới.","下龙湾是世界遗产。"],
  ["Biên Hòa","vi","biên hòa","边和","Bien Hoa","Biên Hòa","城市区域",2,true,"Biên Hòa có nhiều khu công nghiệp.","边和有很多工业区。"],
  ["Bắc Ninh","vi","bắc ninh","北宁","Bac Ninh","Bắc Ninh","城市区域",2,true,"Bắc Ninh phát triển mạnh về công nghiệp điện tử.","北宁电子工业发展很快。"],
  ["Bình Dương","vi","bình dương","平阳","Binh Duong","Bình Dương","城市区域",2,true,"Bình Dương thu hút nhiều nhà đầu tư nước ngoài.","平阳吸引很多外国投资者。"],
  ["Đồng Nai","vi","đồng nai","同奈","Dong Nai","Đồng Nai","城市区域",2,true,"Đồng Nai có nhiều nhà máy sản xuất.","同奈有很多制造工厂。"],
  ["Khu công nghiệp","vi","khu công nghiệp","工业区","Industrial park","Khu công nghiệp","城市区域",2,true,"Nhiều công ty nước ngoài đầu tư vào khu công nghiệp.","很多外国公司投资工业区。"],
  ["Trung tâm thành phố","vi","trung tâm thành phố","市中心","City center","Trung tâm thành phố","城市区域",2,true,"Khách sạn nằm ở trung tâm thành phố.","酒店位于市中心。"],
  ["Ngoại ô","vi","ngoại ô","郊区","Suburb","Ngoại ô","城市区域",2,true,"Ngoại ô yên tĩnh hơn trung tâm thành phố.","郊区比市中心更安静。"],
  ["Khu dân cư","vi","khu dân cư","居民区","Residential area","Khu dân cư","城市区域",2,true,"Khu dân cư này rất an toàn.","这个居民区很安全。"],
  ["Khu thương mại","vi","khu thương mại","商业区","Commercial district","Khu thương mại","城市区域",3,true,"Khu thương mại luôn đông người vào cuối tuần.","商业区周末总是很多人。"],
  ["Khu du lịch","vi","khu du lịch","旅游区","Tourist area","Khu du lịch","城市区域",2,true,"Khu du lịch này thu hút nhiều khách quốc tế.","这个旅游区吸引很多国际游客。"],
  ["Bãi biển","vi","bãi biển","海滩","Beach","Bãi biển","城市区域",1,true,"Bãi biển ở Đà Nẵng rất đẹp.","岘港的海滩非常漂亮。"],
  ["Hồ","vi","hồ","湖","Lake","Hồ","城市区域",1,true,"Hà Nội có nhiều hồ nổi tiếng.","河内有很多著名湖泊。"],
  ["Sông","vi","sông","河流","River","Sông","城市区域",1,true,"Con sông này chảy qua thành phố.","这条河流穿过城市。"],
  ["Cầu","vi","cầu","桥","Bridge","Cầu","城市区域",1,true,"Cây cầu này rất nổi tiếng ở Đà Nẵng.","这座桥在岘港非常有名。"],
  ["Chợ đêm","vi","chợ đêm","夜市","Night market","Chợ đêm","城市区域",2,true,"Chợ đêm bán nhiều đồ ăn ngon.","夜市卖很多美食。"],
  ["Phố cổ","vi","phố cổ","古街","Old quarter","Phố cổ","城市区域",2,true,"Phố cổ Hà Nội rất đông khách du lịch.","河内古街游客很多。"],
  ["Tòa nhà cao tầng","vi","tòa nhà cao tầng","高楼大厦","High-rise building","Tòa nhà cao tầng","城市区域",3,true,"Thành phố có nhiều tòa nhà cao tầng mới.","城市有很多新的高楼大厦。"],
  ["Ga tàu điện","vi","ga tàu điện","地铁站","Metro station","Ga tàu điện","城市区域",2,true,"Ga tàu điện nằm gần trung tâm thương mại.","地铁站靠近商业中心。"],
  ["Sân bay quốc tế","vi","sân bay quốc tế","国际机场","International airport","Sân bay quốc tế","城市区域",2,true,"Sân bay quốc tế rất đông khách du lịch.","国际机场游客很多。"],
  ["Bến xe","vi","bến xe","汽车站","Bus station","Bến xe","城市区域",1,true,"Tôi đang đợi bạn ở bến xe.","我正在汽车站等你。"],
];

(async () => {
  try {
    let inserted = 0;
    for (const w of words) {
      await pool.query(
        `INSERT INTO words (word, language_code, pronunciation, meaning_zh, meaning_en, meaning_vi, category, difficulty, is_published, example_sentence, example_translation)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT DO NOTHING`,
        [w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], w[9], w[10]]
      );
      inserted++;
    }
    console.log(`✅ Successfully imported ${inserted} words!`);
    
    const res = await pool.query('SELECT count(*) as cnt FROM words');
    console.log(`📊 Total words in database: ${res.rows[0].cnt}`);
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
})();
