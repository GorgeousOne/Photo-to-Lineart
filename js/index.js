let imgElement = new Image();
let canvas = document.getElementById('canvas-output');
let saveButton = document.getElementById('save-button');

let blurLabel = document.getElementById('blur-label');
let kernelLabel = document.getElementById('kernel-label');
let blurSlider = document.getElementById('blur');
let kernelSlider = document.getElementById('kernel');

let ctx = canvas.getContext('2d');
let src, gray, grayPreview;
let imgName;
let blurInput, kernelInput, blur, kernel, previewScale;

document.getElementById('image-input').addEventListener('change', function(e) {
	let file = e.target.files[0];
	if (!file) {
		return;
	}
	imgName = file.name.replace(/\.[^/.]+$/, "");
	let reader = new FileReader();
	reader.onload = function(event) {
		imgElement.src = event.target.result;
	};
	reader.readAsDataURL(file);
});

function downscaleImg(img, maxDim) {
	let scale = 1;
	let maxSize = Math.max(img.cols, img.rows);
	console.log(maxSize, maxDim)
	while (maxSize > maxDim) {
		scale *= 2;
		maxSize /= 2;
	}
	console.log(scale, img.cols / scale, img.rows / scale);
	let scaledImg = new cv.Mat();
	cv.resize(img, scaledImg, new cv.Size(img.cols / scale, img.rows / scale), 0, 0, cv.INTER_AREA);
	console.log("pls shrink", scaledImg.cols, scaledImg.rows);
	return [scaledImg, scale];
}

imgElement.onload = function () {
	canvas.width = imgElement.width;
	canvas.height = imgElement.height;
	ctx.drawImage(imgElement, 0, 0, imgElement.width, imgElement.height);
	src = cv.imread(canvas);
	gray = new cv.Mat();
	cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
	//scale to min 360px and max 720px?
	[grayPreview, previewScale] = downscaleImg(gray, 720);
	console.log(grayPreview.cols, grayPreview.rows)
	update();
};

const debouncedUpdate = debounce(update, 300);
document.getElementById('blur').addEventListener('input', debouncedUpdate);
document.getElementById('kernel').addEventListener('input', debouncedUpdate);
saveButton.addEventListener('click', saveImage);

function debounce(func, wait) {
	let timeout;
	return function(...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}

function update() {
	if (!src || !grayPreview) {
		return;
	}
	blurInput = parseInt(blurSlider.value);
	kernelInput = parseInt(kernelSlider.value);
	blurLabel.innerHTML = "Weichzeichner: " + blurInput;
	kernelLabel.innerHTML = "Linienstärke: " + kernelInput;

	blur = (2 * blurInput) | 1;
	kernel = (2 * kernelInput) | 1;
	console.log(blur, kernel)

	let lineImg = lineartImg(grayPreview, blur, kernel);
	cv.imshow(canvas, lineImg);
	lineImg.delete();
	saveButton.disabled = false;
}

function lineartImg(img, blur, kernel) {
	let blurredImg = new cv.Mat();
	let lineImg = new cv.Mat();

	if (blur >= 3) {
		cv.GaussianBlur(img, blurredImg, new cv.Size(blur, blur), 0);
	} else {
		img.copyTo(blurredImg);
	}
	cv.adaptiveThreshold(blurredImg, lineImg, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, kernel, 2);
	//cv.medianBlur(img, blurredImg, blur);
	//cv.adaptiveThreshold(blurredImg, lineImg, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, kernel, 2);
	blurredImg.delete();
	return lineImg;
}

function saveImage() {
	saveButton.disabled = true;
	let scaledBlur = (blur * previewScale) | 1;
	let scaledKernel = (kernel * previewScale) | 1;
	let lineImg = lineartImg(gray, scaledBlur, scaledKernel);
	cv.imshow(canvas, lineImg);
	lineImg.delete();

	let link = document.createElement('a');
	link.href = canvas.toDataURL();
	link.download = imgName + "-weich" + blurInput + "-linie" + kernelInput + ".png";
	link.click();
	saveButton.disabled = false;
}