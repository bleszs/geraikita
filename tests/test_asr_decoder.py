"""Contract tests only; no model inference or user audio."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/probe-asr-decoder.py'
spec = importlib.util.spec_from_file_location('decoder_probe', SOURCE)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class DecoderContracts(unittest.TestCase):
    def test_generation_preserves_tokens_scores_and_no_speech_probability(self):
        value = SimpleNamespace(sequences_ids=[[1, 2]], scores=[-.3], no_speech_prob=.2)
        self.assertEqual(probe.generation_value(value), {'tokens': [[1, 2]], 'scores': [-.3], 'noSpeechProbability': .2})

    def test_replay_uses_captured_production_options_without_sampling(self):
        options = SimpleNamespace(temperatures=[0.0], length_penalty=1, repetition_penalty=1, no_repeat_ngram_size=0,
                                  suppress_blank=True, suppress_tokens=[1, 2])
        values = {'options': options, 'max_length': 448, 'max_initial_timestamp_index': 50, 'kwargs': {'beam_size': 3, 'patience': 1}}
        result = probe.decoder_kwargs(values)
        self.assertEqual(result['beam_size'], 3)
        self.assertEqual(result['max_length'], 448)
        self.assertEqual(result['suppress_tokens'], [1, 2])
        self.assertNotIn('sampling_temperature', result)
        options.temperatures = [0.0, 0.2]
        with self.assertRaises(ValueError):
            probe.decoder_kwargs(values)

    def test_tensor_hash_tracks_content_not_buffer_alignment(self):
        import numpy as np
        first = np.arange(10, dtype=np.float32)
        other = first.copy()
        self.assertEqual(probe.fingerprint(first)['sha256'], probe.fingerprint(other)['sha256'])
        other[0] = 99
        self.assertNotEqual(probe.fingerprint(first)['sha256'], probe.fingerprint(other)['sha256'])


if __name__ == '__main__':
    unittest.main()
