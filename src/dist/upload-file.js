/**
 * markdown上传
 * @param file 文件信息
 * @param opts 额外信息
 * @param success 成功回调 返回(url)=>{}
 * @param failure 失败回调
 * @param progress 进度条
 */
window.markdownUploadFile = function (file, opts, success=()=>{}, failure=()=>{}, progress=()=>{}) {
    var xhr, formData;
    xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open("POST", opts.url);

    xhr.upload.onprogress = function (e) {
        progress((e.loaded / e.total) * 100);
    };

    xhr.onload = function () {
        var json;
        if (xhr.status == 403) {
            failure("HTTP Error: " + xhr.status, { remove: true });
            return;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
            failure("HTTP Error: " + xhr.status);
            return;
        }
        json = JSON.parse(xhr.responseText);
        if (!json || typeof json.location != "string") {
            failure("Invalid JSON: " + xhr.responseText);
            return;
        }
        success(json.location);
    };

    xhr.onerror = function () {
        failure(
            "Image upload failed due to a XHR Transport error. Code: " +
            xhr.status
        );
    };

    formData = new FormData();
    formData.append("file", file, file.name);
    if (opts.extra != null) {
        for (const key in opts.extra) {
            if (Object.hasOwnProperty.call(opts.extra, key)) {
                const val1 = opts.extra[key];
                formData.append(key, val1);
            }
        }
    }

    xhr.send(formData);
};

