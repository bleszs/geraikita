"""Technical audio fixtures only; these tests do not measure recognition accuracy."""
import io
from pathlib import Path
import sys
import unittest
import wave
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server/ml"))
from transcribe import AudioError, decode_bounded, load_model


def wav(samples, rate=16000, channels=1):
    output = io.BytesIO()
    with wave.open(output, "wb") as f:
        f.setnchannels(channels)
        f.setsampwidth(2)
        f.setframerate(rate)
        f.writeframes(np.asarray(samples, dtype='<i2').tobytes())
    return output.getvalue()


class VoiceTests(unittest.TestCase):
    def error(self, data, code):
        with self.assertRaises(AudioError) as caught:
            decode_bounded(data)
        self.assertEqual(caught.exception.code, code)

    def test_malformed_empty_and_oversized(self):
        for data in (b'', b'not an audio container', b'x' * 1048577):
            self.error(data, 'invalid_audio')

    def test_silence_and_near_silence_not_hallucinated(self):
        self.error(wav(np.zeros(32000)), 'no_speech')
        self.error(wav(np.ones(16000)), 'no_speech')

    def test_short_and_long_decoded_audio(self):
        self.error(wav(np.ones(1000) * 4000), 'too_short')
        self.error(wav(np.ones(16000 * 31) * 4000), 'too_long')

    def test_stereo_is_resampled_to_bounded_mono(self):
        x=(np.sin(np.arange(48000) * 0.1) * 5000).astype(np.int16)
        audio=decode_bounded(wav(np.repeat(x, 2), rate=48000, channels=2))
        self.assertEqual(len(audio), 16000)
        self.assertEqual(audio.dtype, np.float32)
        self.assertTrue(np.isfinite(audio).all())

    def test_duration_boundary_does_not_depend_on_supplied_metadata(self):
        # Compressible silence is bounded by decoded samples, not browser metadata.
        self.error(wav(np.zeros(16000 * 30)), 'no_speech')
        self.error(wav(np.zeros(16000 * 30 + 1)), 'too_long')

    def test_installed_cpu_model_and_vad_execute_offline(self):
        model=load_model()
        segments, _=model.transcribe(np.zeros(32000, dtype=np.float32), language='id', vad_filter=True)
        self.assertEqual(list(segments), [])

    def test_browser_webm_opus_decodes_to_real_pcm(self):
        import av
        output=io.BytesIO()
        with av.open(output, mode='w', format='webm') as container:
            stream=container.add_stream('libopus', rate=48000)
            stream.layout='mono'
            audio=(np.sin(np.arange(48000) * 2 * np.pi * 440 / 48000) * 0.15).astype(np.float32).reshape(1, -1)
            frame=av.AudioFrame.from_ndarray(audio, format='flt', layout='mono')
            frame.sample_rate=48000
            for packet in stream.encode(frame):
                container.mux(packet)
            for packet in stream.encode(None):
                container.mux(packet)
        decoded=decode_bounded(output.getvalue())
        self.assertEqual(len(decoded), 16000)
        self.assertGreater(float(np.sqrt(np.mean(decoded ** 2))), 0.05)


if __name__ == '__main__':
    unittest.main()
