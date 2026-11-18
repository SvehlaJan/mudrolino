import subprocess
import unittest
from unittest.mock import patch

import process_recording as session
import split_audio as manual


class AudioSplitContracts(unittest.TestCase):
    def test_segment_boundaries_keep_each_profiles_strict_speech_threshold(self):
        # The manual profile keeps 125 ms speech; the session profile rejects it.
        silences = [(0.125, 0.25), (0.375, 0.5)]
        self.assertEqual(manual.silences_to_segments(silences, 0.625),
                         [(0.0, 0.125), (0.25, 0.375), (0.5, 0.625)])
        self.assertEqual(session.silences_to_segments(silences, 0.625), [])
        for module in (manual, session):
            with self.subTest(profile=module.__name__):
                minimum = module.MIN_SPEECH_DURATION
                self.assertEqual(module.silences_to_segments([(minimum, 1.0)], 1.0), [])
                self.assertEqual(module.silences_to_segments([(0.0, 0.0), (minimum, minimum)], minimum), [])
                self.assertEqual(module.silences_to_segments([(0.0, 0.0)], minimum), [])
                self.assertEqual(module.silences_to_segments([(0.0, 1.0)], 1.0 + minimum / 2), [])

    def test_no_silence_keeps_the_whole_take_even_when_shorter_than_minimum(self):
        for module in (manual, session):
            with self.subTest(profile=module.__name__):
                self.assertEqual(module.silences_to_segments([], 0.05), [(0.0, 0.05)])
                self.assertEqual(module.silences_to_segments([], 0.0), [(0.0, 0.0)])

    def test_trailing_speech_survives_without_an_extra_end_silence(self):
        for module in (manual, session):
            with self.subTest(profile=module.__name__):
                self.assertEqual(module.silences_to_segments([(0.0, 0.5), (1.0, 1.5)], 2.0),
                                 [(0.5, 1.0), (1.5, 2.0)])

    def test_duration_and_detection_keep_probe_contract_and_profile_defaults(self):
        for module, noise, duration in ((manual, '-35dB', 0.5), (session, '-32dB', 0.6)):
            with self.subTest(profile=module.__name__), patch('subprocess.run') as run:
                run.return_value = subprocess.CompletedProcess([], 0, stdout=' 2.5\n')
                self.assertEqual(module.get_duration('take.m4a'), 2.5)
                run.assert_called_once_with([
                    'ffprobe', '-v', 'quiet', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', 'take.m4a',
                ], capture_output=True, text=True, check=True)
                run.reset_mock()
                # An unpaired trailing start stays ignored, matching ffmpeg parsing today.
                run.return_value = subprocess.CompletedProcess([], 1, stderr=(
                    'silence_start: 0.25\nsilence_end: 0.75\nsilence_start: 2.0\n'))
                self.assertEqual(module.detect_silences('take.m4a'), [(0.25, 0.75)])
                run.assert_called_once_with([
                    'ffmpeg', '-i', 'take.m4a', '-af',
                    f'silencedetect=noise={noise}:d={duration}', '-f', 'null', '-',
                ], capture_output=True, text=True, check=False)

    def test_manual_padding_clamps_to_take_with_post_input_seek_and_original_encoder_flags(self):
        with patch('subprocess.run') as run:
            manual.extract_segment('take.m4a', 0.02, 1.98, 'clip.mp3', 2.0)
            run.assert_called_once_with([
                'ffmpeg', '-y', '-i', 'take.m4a', '-ss', '0.0', '-t', '2.0',
                '-q:a', '2', '-codec:a', 'libmp3lame', 'clip.mp3',
            ], capture_output=True, check=True)

    def test_session_padding_clamps_to_take_with_input_seek_and_original_encoder_flags(self):
        with patch('subprocess.run') as run:
            session.extract_segment('take.m4a', 0.02, 1.98, 'clip.mp3', 2.0)
            run.assert_called_once_with([
                'ffmpeg', '-y', '-ss', '0.000', '-t', '2.000', '-i', 'take.m4a',
                '-vn', '-c:a', 'libmp3lame', '-q:a', '2', '-ar', '44100', 'clip.mp3',
            ], capture_output=True, check=True)

    def test_export_profiles_keep_distinct_padding_and_timestamp_precision(self):
        for module, expected_start, expected_duration in (
                (manual, '0.45', '0.6000000000000001'), (session, '0.440', '0.620')):
            with self.subTest(profile=module.__name__), patch('subprocess.run') as run:
                module.extract_segment('take.m4a', 0.5, 1.0, 'clip.mp3', 2.0)
                run.assert_called_once()
                command = run.call_args.args[0]
                self.assertEqual(command[command.index('-ss') + 1], expected_start)
                self.assertEqual(command[command.index('-t') + 1], expected_duration)


if __name__ == '__main__':
    unittest.main()
