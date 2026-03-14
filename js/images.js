// ══ IMAGES ══

var _unitImgFiles = [];

function previewUnitImgs(input) {
  _unitImgFiles = Array.from(input.files);
  var preview = document.getElementById('unit-imgs-preview');
  if(!preview) return;
  preview.innerHTML = '';
  _unitImgFiles.forEach((file,i)=>{
    var reader = new FileReader();
    reader.onload = function(e) {
      var div = document.createElement('div');
      div.style.cssText = 'position:relative;width:70px;height:70px';
      div.innerHTML = `<img src="${e.target.result}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:2px solid var(--border)">
        <button onclick="removeUnitImg(${i})" style="position:absolute;top:-4px;right:-4px;background:var(--red);border:none;border-radius:50%;width:18px;height:18px;color:#fff;font-size:10px;cursor:pointer;line-height:18px;text-align:center">×</button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeUnitImg(idx) {
  _unitImgFiles.splice(idx,1);
  var input = document.getElementById('u-imgs');
  // Recreate FileList simulation by re-triggering preview
  previewUnitImgs({files: _unitImgFiles});
}

async function uploadUnitImages(unitId) {
  if(!_unitImgFiles.length) return [];
  // Store images as base64 in a separate 'unit_images' table if it exists
  // Otherwise skip silently
  try {
    var urls = [];
    for(var file of _unitImgFiles) {
      var base64 = await new Promise((res,rej)=>{
        var r = new FileReader();
        r.onload = ()=>res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      // Try to insert into unit_images table
      var { error } = await sb.from('unit_images').insert({
        unit_id: unitId,
        image_data: base64,
        file_name: file.name,
        created_at: new Date().toISOString()
      });
      if(!error) urls.push(base64);
    }
    return urls;
  } catch(e) {
    console.log('Image upload skipped:', e.message);
    return [];
  }
}

async function loadUnitImages(unitId) {
  try {
    var { data } = await sb.from('unit_images').select('id,image_data,file_name,created_at')
      .eq('unit_id', unitId).order('created_at');
    return data || [];
  } catch(e) { return []; }
}


window.previewUnitImgs=previewUnitImgs; window.removeUnitImg=removeUnitImg; window.uploadUnitImages=uploadUnitImages; window.loadUnitImages=loadUnitImages;