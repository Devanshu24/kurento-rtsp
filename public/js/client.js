const socket=io(':8443', {secure: true});

const $startbutton = document.querySelector('#main');
const $video1 =  document.querySelector('video');
const $stopbutton = document.querySelector('#stop')

$stopbutton.setAttribute('disabled', 'disabled')

let videostream = null;

$startbutton.addEventListener('click', ()=> {
    

    console.log("hu")

    const success = (mediaStream)=> {
        videostream = mediaStream;
        $video1.srcObject = mediaStream;
        console.log('hah')
        $startbutton.setAttribute('disabled', 'disabled');
        $stopbutton.removeAttribute('disabled');
    }

    const failure = (error)=> {
        console.log(error);
    }

    navigator.mediaDevices.getUserMedia({video :true})
    .then(success).catch(failure);
})

$stopbutton.addEventListener('click', () => {
    videostream.getTracks().forEach(function(track) {
        track.stop();
    });
    $video1.srcObject=null;
    $startbutton.removeAttribute('disabled');
    $stopbutton.setAttribute('disabled', 'disabled');

})

